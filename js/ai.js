/* =============================================================
   AI.JS — Clinical Decision Support Engine
   Rules-based AI for vitals analysis, risk scoring, alerts
   ============================================================= */

const AI = (() => {
    /* ── Normal Ranges ── */
    const RANGES = Utils.VITAL_RANGES;

    /* ── 1. Abnormal Vitals Detector ── */
    function detectAbnormalVitals(vitalsRecord) {
        const abnomalities = [];
        const keys = ['temperature', 'systolicBP', 'diastolicBP', 'heartRate', 'oxygenSaturation', 'respiratoryRate'];
        keys.forEach(key => {
            const val = vitalsRecord[key];
            if (val === null || val === undefined || val === '') return;
            const range = RANGES[key];
            const v = parseFloat(val);
            if (v < range.min) {
                abnomalities.push({ key, value: v, range, direction: 'low', severity: getSeverity(key, v, 'low') });
            } else if (v > range.max) {
                abnomalities.push({ key, value: v, range, direction: 'high', severity: getSeverity(key, v, 'high') });
            }
        });
        return abnomalities;
    }

    function getSeverity(key, value, direction) {
        const severeThresholds = {
            temperature: { high: 39.5, low: 35.0 },
            systolicBP: { high: 180, low: 80 },
            diastolicBP: { high: 120, low: 50 },
            heartRate: { high: 130, low: 40 },
            oxygenSaturation: { high: 101, low: 88 },
            respiratoryRate: { high: 30, low: 8 }
        };
        const t = severeThresholds[key];
        if (!t) return 'moderate';
        if (direction === 'high') return value >= t.high ? 'severe' : 'moderate';
        return value <= t.low ? 'severe' : 'moderate';
    }

    /* ── 2. Trend Analyzer (last N readings) ── */
    function analyzeTrends(patientId, N = 5) {
        const vitals = DB.getPatientVitals(patientId).slice(0, N);
        if (vitals.length < 2) return { trends: {}, hasCriticalTrend: false };
        const keys = ['temperature', 'systolicBP', 'heartRate', 'oxygenSaturation', 'respiratoryRate'];
        const trends = {};
        let hasCriticalTrend = false;
        keys.forEach(key => {
            const vals = vitals.map(v => parseFloat(v[key])).filter(x => !isNaN(x));
            if (vals.length < 2) return;
            const oldest = vals[vals.length - 1];
            const newest = vals[0];
            const delta = newest - oldest;
            const pct = ((delta / oldest) * 100).toFixed(1);
            let direction = delta > 0.5 ? 'increasing' : delta < -0.5 ? 'decreasing' : 'stable';
            let isCritical = false;
            /* O2 decreasing is bad; temperature increasing, high HR increasing */
            if (key === 'oxygenSaturation' && direction === 'decreasing' && delta < -2) isCritical = true;
            if (key === 'heartRate' && direction === 'increasing' && newest > 100) isCritical = true;
            if (key === 'temperature' && direction === 'increasing' && newest > 38.5) isCritical = true;
            if (key === 'respiratoryRate' && direction === 'increasing' && newest > 22) isCritical = true;
            if (isCritical) hasCriticalTrend = true;
            trends[key] = { direction, delta: parseFloat(delta.toFixed(2)), pct, oldest, newest, isCritical, values: vals };
        });
        return { trends, hasCriticalTrend };
    }

    /* ── 3. Risk Score Calculator ── */
    function calculateRiskScore(patient, vitals, trends) {
        let score = 0;
        if (!vitals || vitals.length === 0) return 10;
        const latest = vitals[0];

        /* Vital-based scoring */
        if (latest.oxygenSaturation < 88) score += 25;
        else if (latest.oxygenSaturation < 92) score += 15;
        else if (latest.oxygenSaturation < 95) score += 7;

        if (latest.heartRate > 130) score += 20;
        else if (latest.heartRate > 110) score += 12;
        else if (latest.heartRate > 100) score += 6;
        else if (latest.heartRate < 45) score += 18;

        if (latest.temperature > 39.5) score += 18;
        else if (latest.temperature > 38.5) score += 10;
        else if (latest.temperature > 38.0) score += 5;
        else if (latest.temperature < 35.5) score += 15;

        if (latest.systolicBP > 180) score += 18;
        else if (latest.systolicBP > 160) score += 10;
        else if (latest.systolicBP < 85) score += 20;

        if (latest.respiratoryRate > 28) score += 20;
        else if (latest.respiratoryRate > 22) score += 10;
        else if (latest.respiratoryRate < 10) score += 15;

        /* Trend penalty */
        if (trends?.hasCriticalTrend) score += 15;

        /* Status penalty */
        if (patient.status === 'critical') score += 10;

        /* Age factor */
        if (patient.age > 70) score += 8;
        else if (patient.age > 60) score += 5;

        /* History factors */
        const hist = (patient.medicalHistory || '').toLowerCase();
        if (hist.includes('diabetes')) score += 5;
        if (hist.includes('hypertension')) score += 4;
        if (hist.includes('copd')) score += 6;
        if (hist.includes('smoking')) score += 4;

        return Math.min(100, score);
    }

    /* ── 4. Pattern Matcher → Risk Labels ── */
    function matchPatterns(patient, latest, trends) {
        const patterns = [];
        if (!latest) return patterns;
        const t = latest.temperature;
        const hr = latest.heartRate;
        const spo2 = latest.oxygenSaturation;
        const sbp = latest.systolicBP;
        const rr = latest.respiratoryRate;
        const trendObj = trends?.trends || {};

        /* Sepsis Signs (qSOFA-like) */
        if (t > 38.3 && hr > 90 && rr > 20) patterns.push('⚠️ Sepsis SIRS Criteria Met (fever + tachycardia + tachypnea)');
        /* Respiratory Distress */
        if (spo2 < 92 && rr > 22) patterns.push('🫁 Respiratory Distress Pattern (low O₂ + high RR)');
        /* Cardiac Instability */
        if (sbp > 160 && hr > 100) patterns.push('🫀 Hypertensive Emergency Risk (BP>160 + tachycardia)');
        if (sbp < 90) patterns.push('🚨 Hypotension / Shock Risk (SBP < 90 mmHg)');
        /* Worsening Trends */
        if (trendObj.oxygenSaturation?.isCritical) patterns.push('📉 O₂ Saturation — Worsening Trend Detected');
        if (trendObj.heartRate?.isCritical) patterns.push('📈 Heart Rate — Escalating Trend Detected');
        if (trendObj.temperature?.isCritical) patterns.push('🌡️ Temperature — Rising Fever Pattern');
        /* Hypothermia */
        if (t < 35.5) patterns.push('❄️ Hypothermia — Body temp critically low');
        /* Bradycardia */
        if (hr < 45) patterns.push('💔 Severe Bradycardia — possible heart block');

        return patterns;
    }

    /* ── 5. Diagnosis Suggester ── */
    function suggestDiagnoses(patient, latest, patterns) {
        if (!latest || !patient) return [];
        const suggestions = [];
        const history = (patient.medicalHistory + ' ' + (patient.currentDiagnosis || '')).toLowerCase();
        const t = latest.temperature;
        const hr = latest.heartRate;
        const spo2 = latest.oxygenSaturation;
        const sbp = latest.systolicBP;
        const rr = latest.respiratoryRate;

        /* Pattern-based suggestion */
        if (t > 38.3 && hr > 90 && rr > 20) {
            suggestions.push({ diagnosis: 'Sepsis / Septic Shock', confidence: 'High', reason: 'SIRS criteria met' });
        }
        if (spo2 < 92 && rr > 22 && history.includes('copd')) {
            suggestions.push({ diagnosis: 'COPD Exacerbation with Respiratory Failure', confidence: 'High', reason: 'Low O₂ + high RR + COPD history' });
        }
        if (sbp > 160 && hr > 100 && history.includes('hypertension')) {
            suggestions.push({ diagnosis: 'Hypertensive Emergency', confidence: 'High', reason: 'BP crisis + tachycardia + hypertension history' });
        }
        if (sbp < 90 && hr > 100) {
            suggestions.push({ diagnosis: 'Distributive Shock (Septic/Cardiogenic)', confidence: 'Medium', reason: 'Hypotension + tachycardia' });
        }
        if (spo2 < 92 && !history.includes('copd')) {
            suggestions.push({ diagnosis: 'Pulmonary Embolism (consider)', confidence: 'Medium', reason: 'Sudden O₂ drop without known lung disease' });
        }
        if (t > 39.5 && hr > 100 && spo2 < 94) {
            suggestions.push({ diagnosis: 'Severe Infection / Bacteremia', confidence: 'Medium', reason: 'High fever + elevated HR + poor O₂' });
        }

        /* Remove duplicates */
        return suggestions.slice(0, 4);
    }

    /* ── 6. Drug Interaction Checker ── */
    const DRUG_INTERACTIONS = [
        { drug1: 'warfarin', drug2: 'aspirin', risk: 'Major', description: 'Increased bleeding risk — combined anticoagulation' },
        { drug1: 'warfarin', drug2: 'ibuprofen', risk: 'Major', description: 'Increased bleeding risk' },
        { drug1: 'metoprolol', drug2: 'verapamil', risk: 'Major', description: 'Risk of heart block and severe bradycardia' },
        { drug1: 'clopidogrel', drug2: 'omeprazole', risk: 'Moderate', description: 'Omeprazole reduces clopidogrel efficacy' },
        { drug1: 'digoxin', drug2: 'amiodarone', risk: 'Major', description: 'Amiodarone increases digoxin toxicity risk' },
        { drug1: 'ace inhibitor', drug2: 'potassium', risk: 'Moderate', description: 'Hyperkalemia risk' },
        { drug1: 'ssri', drug2: 'tramadol', risk: 'Major', description: 'Serotonin syndrome risk' },
        { drug1: 'metformin', drug2: 'contrast', risk: 'Major', description: 'Contrast causes lactic acidosis with Metformin — must hold' }
    ];

    function checkDrugInteractions(prescriptions) {
        const drugNames = prescriptions.map(p => p.drug.toLowerCase());
        const found = [];
        DRUG_INTERACTIONS.forEach(interaction => {
            const hasDrug1 = drugNames.some(d => d.includes(interaction.drug1));
            const hasDrug2 = drugNames.some(d => d.includes(interaction.drug2));
            if (hasDrug1 && hasDrug2) found.push(interaction);
        });
        return found;
    }

    /* ── 7. Readmission Risk ── */
    function predictReadmission(patient, vitals) {
        let score = 0;
        if (patient.age > 65) score += 20;
        if ((patient.medicalHistory || '').split(',').length > 2) score += 15;
        const abnormalVitals = vitals.filter(v => v.isAbnormal).length;
        score += Math.min(30, abnormalVitals * 10);
        if (patient.status === 'critical') score += 20;
        if (score >= 60) return 'high';
        if (score >= 35) return 'medium';
        return 'low';
    }

    /* ── Full Analysis Pipeline ── */
    function analyzePatient(patientId) {
        const patient = DB.getById('patients', patientId);
        if (!patient) return null;
        const vitalsList = DB.getPatientVitals(patientId);
        const latest = vitalsList[0] || null;
        const { trends, hasCriticalTrend } = analyzeTrends(patientId);
        const abnormals = latest ? detectAbnormalVitals(latest) : [];
        const patterns = matchPatterns(patient, latest, { trends });
        const suggestions = suggestDiagnoses(patient, latest, patterns);
        const notes = DB.getPatientNotes(patientId);
        const prescriptions = notes.flatMap(n => n.prescription || []);
        const drugInteractions = checkDrugInteractions(prescriptions);
        const riskScore = calculateRiskScore(patient, vitalsList, { trends, hasCriticalTrend });
        const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
        const readmissionRisk = predictReadmission(patient, vitalsList);

        /* Store AI Alert if significant */
        if (riskScore >= 35 || patterns.length > 0) {
            /* Remove old unacknowledged alert for this patient */
            const existing = DB.query('aiAlerts', a => a.patientId === patientId && !a.acknowledged);
            existing.forEach(a => DB.update('aiAlerts', a.id, { acknowledged: true }));
            const alert = {
                id: Utils.generateId('ALERT'),
                patientId,
                patientName: patient.name,
                riskScore,
                riskLevel,
                patterns,
                suggestedDiagnoses: suggestions.map(s => s.diagnosis),
                drugInteractions,
                readmissionRisk,
                recoveryTimeline: riskLevel === 'high' ? 'Uncertain — requires intensive care' : riskLevel === 'medium' ? '5-10 days with treatment' : '2-5 days',
                generatedAt: Utils.nowISO(),
                acknowledged: false
            };
            DB.insert('aiAlerts', alert);
            DB.log('AI_ANALYSIS', `Risk score ${riskScore} for ${patient.name}`, null);
        }

        return {
            patient, latest, vitalsList, trends, hasCriticalTrend,
            abnormals, patterns, suggestions, drugInteractions,
            riskScore, riskLevel, readmissionRisk
        };
    }

    /* ── Vitals Alert Message ── */
    function getVitalsAlertMessage(abnormals) {
        if (!abnormals.length) return null;
        const critical = abnormals.filter(a => a.severity === 'severe');
        if (critical.length) {
            return `🚨 CRITICAL: ${critical.map(a => `${RANGES[a.key].name} = ${a.value} ${RANGES[a.key].unit}`).join(', ')} — Notify doctor immediately!`;
        }
        return `⚠️ Abnormal: ${abnormals.map(a => `${RANGES[a.key].name} = ${a.value} ${RANGES[a.key].unit}`).join(', ')}`;
    }

    return {
        detectAbnormalVitals, analyzeTrends, calculateRiskScore,
        matchPatterns, suggestDiagnoses, checkDrugInteractions,
        predictReadmission, analyzePatient, getVitalsAlertMessage,
        DRUG_INTERACTIONS
    };
})();
