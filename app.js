// Pool Monitor Advanced - JavaScript Application Logic

class PoolMonitor {
    constructor() {
        this.poolSize = 55; // metri cubi
        this.measurements = this.loadMeasurements();
        this.charts = {};
        this.optimumValues = {
            ph: { min: 7.2, max: 7.6, ideal: 7.4 },
            chlorine: { min: 1.0, max: 1.5, ideal: 1.2 }
        };
        this.recommendations = {
            chloroShock: { dosagePerCubicMeter: "10-15", unit: "g", total: "550-825" },
            antiAlgae: { dosagePerCubicMeter: "5", unit: "ml", total: "275" },
            chloroMultiAction: { dosage: "1 pastiglia ogni 20-25 metri cubi", total: "2-3 pastiglie" },
            phMinus: { dosagePerTenCubicMeters: "20-30", unit: "g", total: "110-165" },
            phPlus: { dosagePerTenCubicMeters: "20-30", unit: "g", total: "110-165" }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentDate();
        this.updateCurrentStatus();
        this.renderHistoryTable();
        this.initCharts();
        this.updateActionRecommendation();
        this.updateDataCount();
        this.updateCurrentDateDisplay();
    }

    loadMeasurements() {
        const stored = localStorage.getItem('poolMonitorMeasurements');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return this.validateMeasurements(parsed);
            } catch (error) {
                console.error('Errore nel caricamento dei dati:', error);
            }
        }

        // Dati di esempio se non ci sono dati salvati
        const defaultData = [
            {
                date: "2025-05-29",
                ph: 7.4,
                chlorine: 1.2,
                products: [
                    { type: "chloroShock", quantity: 100, unit: "g" },
                    { type: "antiAlgae", quantity: 50, unit: "ml" },
                    { type: "chloroMultiAction", quantity: 1, unit: "pastiglia" },
                    { type: "phMinus", quantity: 0, unit: "g" },
                    { type: "phPlus", quantity: 30, unit: "g" }
                ]
            },
            {
                date: "2025-05-30",
                ph: 7.3,
                chlorine: 1.1,
                products: [
                    { type: "chloroShock", quantity: 0, unit: "g" },
                    { type: "antiAlgae", quantity: 0, unit: "ml" },
                    { type: "chloroMultiAction", quantity: 2, unit: "pastiglia" },
                    { type: "phMinus", quantity: 50, unit: "g" },
                    { type: "phPlus", quantity: 0, unit: "g" }
                ]
            },
            {
                date: "2025-05-31",
                ph: 7.5,
                chlorine: 1.3,
                products: [
                    { type: "chloroShock", quantity: 150, unit: "g" },
                    { type: "antiAlgae", quantity: 75, unit: "ml" },
                    { type: "chloroMultiAction", quantity: 0, unit: "pastiglia" },
                    { type: "phMinus", quantity: 0, unit: "g" },
                    { type: "phPlus", quantity: 0, unit: "g" }
                ]
            }
        ];

        this.saveMeasurements(defaultData);
        return defaultData;
    }

    validateMeasurements(measurements) {
        return measurements.filter(measurement => {
            return measurement.date && 
                   !isNaN(measurement.ph) && measurement.ph > 0 &&
                   !isNaN(measurement.chlorine) && measurement.chlorine >= 0 &&
                   Array.isArray(measurement.products);
        }).map(measurement => ({
            ...measurement,
            ph: parseFloat(measurement.ph),
            chlorine: parseFloat(measurement.chlorine),
            products: measurement.products.map(product => ({
                ...product,
                quantity: parseFloat(product.quantity) || 0
            }))
        }));
    }

    saveMeasurements(measurements = this.measurements) {
        try {
            localStorage.setItem('poolMonitorMeasurements', JSON.stringify(measurements));
        } catch (error) {
            console.error('Errore nel salvataggio dei dati:', error);
            this.showToast('Errore nel salvataggio dei dati', 'error');
        }
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('measurement-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMeasurement();
            });
        }

        // Clear data button
        const clearBtn = document.getElementById('clear-data');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.showConfirmModal();
            });
        }

        // Modal buttons
        const confirmBtn = document.getElementById('confirm-delete');
        const cancelBtn = document.getElementById('cancel-delete');
        const modal = document.getElementById('confirm-modal');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.clearHistoricalData();
                this.hideConfirmModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideConfirmModal();
            });
        }

        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'confirm-modal') {
                    this.hideConfirmModal();
                }
            });
        }

        // Handle ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                this.hideConfirmModal();
            }
        });

        // Real-time input validation
        this.setupInputValidation();
    }

    setupInputValidation() {
        const phInput = document.getElementById('ph');
        const chlorineInput = document.getElementById('chlorine');

        if (phInput) {
            phInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.validateInput(e.target, value, 6.0, 8.5);
            });
        }

        if (chlorineInput) {
            chlorineInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.validateInput(e.target, value, 0, 5.0);
            });
        }
    }

    validateInput(input, value, min, max) {
        if (isNaN(value) || value < min || value > max) {
            input.style.borderColor = 'var(--color-error)';
        } else {
            input.style.borderColor = 'var(--color-success)';
        }
    }

    setCurrentDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    updateCurrentDateDisplay() {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const displays = [
            'current-date-display',
            'current-date-display-2',
            'current-date-modal'
        ];

        displays.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = formattedDate;
            }
        });
    }

    updateDataCount() {
        const count = this.measurements.length;
        const countDisplays = ['data-count', 'data-count-2'];
        
        countDisplays.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'data-count-2') {
                    element.textContent = `${count} giorni`;
                } else {
                    element.textContent = count.toString();
                }
            }
        });
    }

    updateCurrentStatus() {
        const latest = this.measurements[this.measurements.length - 1];
        const phElement = document.getElementById('current-ph');
        const chlorineElement = document.getElementById('current-chlorine');
        
        if (latest && phElement && chlorineElement) {
            phElement.textContent = latest.ph.toFixed(1);
            chlorineElement.textContent = latest.chlorine.toFixed(1) + ' ppm';
            
            // Apply status classes
            phElement.className = 'value-display ' + this.getStatusClass('ph', latest.ph);
            chlorineElement.className = 'value-display ' + this.getStatusClass('chlorine', latest.chlorine);
        } else if (phElement && chlorineElement) {
            phElement.textContent = '--';
            chlorineElement.textContent = '--';
            phElement.className = 'value-display';
            chlorineElement.className = 'value-display';
        }
    }

    getStatusClass(type, value) {
        if (isNaN(value)) return 'danger';
        
        const range = this.optimumValues[type];
        if (value >= range.min && value <= range.max) {
            return 'optimal';
        } else if ((type === 'ph' && (value >= range.min - 0.2 && value <= range.max + 0.2)) ||
                   (type === 'chlorine' && (value >= range.min - 0.3 && value <= range.max + 0.3))) {
            return 'warning';
        } else {
            return 'danger';
        }
    }

    addMeasurement() {
        const form = document.getElementById('measurement-form');
        if (!form) return;

        const formData = new FormData(form);
        
        // Validate inputs
        const date = formData.get('date');
        const ph = parseFloat(formData.get('ph'));
        const chlorine = parseFloat(formData.get('chlorine'));

        if (!date || isNaN(ph) || isNaN(chlorine)) {
            this.showToast('Inserisci valori validi per data, pH e cloro', 'error');
            return;
        }

        if (ph < 6.0 || ph > 8.5) {
            this.showToast('Il pH deve essere tra 6.0 e 8.5', 'error');
            return;
        }

        if (chlorine < 0 || chlorine > 5.0) {
            this.showToast('Il cloro deve essere tra 0 e 5.0 ppm', 'error');
            return;
        }

        const measurement = {
            date: date,
            ph: ph,
            chlorine: chlorine,
            products: [
                { type: "chloroShock", quantity: parseFloat(formData.get('chloroShock')) || 0, unit: "g" },
                { type: "antiAlgae", quantity: parseFloat(formData.get('antiAlgae')) || 0, unit: "ml" },
                { type: "chloroMultiAction", quantity: parseFloat(formData.get('chloroMultiAction')) || 0, unit: "pastiglia" },
                { type: "phMinus", quantity: parseFloat(formData.get('phMinus')) || 0, unit: "g" },
                { type: "phPlus", quantity: parseFloat(formData.get('phPlus')) || 0, unit: "g" }
            ]
        };

        // Check if measurement for this date already exists
        const existingIndex = this.measurements.findIndex(m => m.date === measurement.date);
        if (existingIndex !== -1) {
            this.measurements[existingIndex] = measurement;
            this.showToast('Misurazione aggiornata con successo!', 'success');
        } else {
            this.measurements.push(measurement);
            this.showToast('Misurazione aggiunta con successo!', 'success');
        }

        // Sort measurements by date
        this.measurements.sort((a, b) => new Date(a.date) - new Date(b.date));

        this.saveMeasurements();
        this.updateCurrentStatus();
        this.renderHistoryTable();
        this.updateCharts();
        this.updateActionRecommendation();
        this.updateDataCount();
        
        // Reset form
        form.reset();
        this.setCurrentDate();
    }

    renderHistoryTable() {
        const tbody = document.querySelector('#history-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.measurements.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align: center; color: var(--color-text-secondary); font-style: italic;">Nessuna misurazione disponibile</td>';
            tbody.appendChild(row);
            return;
        }

        // Sort measurements by date (most recent first for display)
        const sortedMeasurements = [...this.measurements].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedMeasurements.forEach((measurement, index) => {
            const row = document.createElement('tr');
            if (index === 0) { // Most recent entry
                row.classList.add('new-entry');
            }
            
            const products = measurement.products || [];
            const chloroShock = products.find(p => p.type === 'chloroShock')?.quantity || 0;
            const antiAlgae = products.find(p => p.type === 'antiAlgae')?.quantity || 0;
            const chloroMultiAction = products.find(p => p.type === 'chloroMultiAction')?.quantity || 0;
            const phMinus = products.find(p => p.type === 'phMinus')?.quantity || 0;
            const phPlus = products.find(p => p.type === 'phPlus')?.quantity || 0;

            row.innerHTML = `
                <td>${this.formatDate(measurement.date)}</td>
                <td><span class="ph-value ${this.getStatusClass('ph', measurement.ph)}">${isNaN(measurement.ph) ? '-' : measurement.ph.toFixed(1)}</span></td>
                <td><span class="chlorine-value ${this.getStatusClass('chlorine', measurement.chlorine)}">${isNaN(measurement.chlorine) ? '-' : measurement.chlorine.toFixed(1) + ' ppm'}</span></td>
                <td>${chloroShock > 0 ? chloroShock + ' g' : '-'}</td>
                <td>${antiAlgae > 0 ? antiAlgae + ' ml' : '-'}</td>
                <td>${chloroMultiAction > 0 ? chloroMultiAction + ' pastiglia' + (chloroMultiAction > 1 ? 'e' : '') : '-'}</td>
                <td>${phMinus > 0 ? phMinus + ' g' : '-'}</td>
                <td>${phPlus > 0 ? phPlus + ' g' : '-'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString + 'T00:00:00');
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    initCharts() {
        // Wait for DOM to be ready
        setTimeout(() => {
            this.createPhChlorineChart();
            this.createProductsChart();
        }, 100);
    }

    createPhChlorineChart() {
        const ctx = document.getElementById('phChlorineChart');
        if (!ctx) return;
        
        const chartContext = ctx.getContext('2d');
        const labels = this.measurements.map(m => this.formatDate(m.date));
        const phData = this.measurements.map(m => isNaN(m.ph) ? null : m.ph);
        const chlorineData = this.measurements.map(m => isNaN(m.chlorine) ? null : m.chlorine);

        if (this.charts.phChlorine) {
            this.charts.phChlorine.destroy();
        }

        this.charts.phChlorine = new Chart(chartContext, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH',
                        data: phData,
                        borderColor: '#1FB8CD',
                        backgroundColor: 'rgba(31, 184, 205, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y',
                        pointBackgroundColor: '#1FB8CD',
                        pointBorderColor: '#1FB8CD',
                        pointHoverBackgroundColor: '#1FB8CD',
                        pointHoverBorderColor: '#fff'
                    },
                    {
                        label: 'Cloro (ppm)',
                        data: chlorineData,
                        borderColor: '#FFC185',
                        backgroundColor: 'rgba(255, 193, 133, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1',
                        pointBackgroundColor: '#FFC185',
                        pointBorderColor: '#FFC185',
                        pointHoverBackgroundColor: '#FFC185',
                        pointHoverBorderColor: '#fff'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Andamento pH e Cloro nel Tempo',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'pH'
                        },
                        min: 6.5,
                        max: 8.0
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Cloro (ppm)'
                        },
                        min: 0,
                        max: 2.0,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    createProductsChart() {
        const ctx = document.getElementById('productsChart');
        if (!ctx) return;
        
        const chartContext = ctx.getContext('2d');
        const labels = this.measurements.map(m => this.formatDate(m.date));
        const productTypes = ['chloroShock', 'antiAlgae', 'chloroMultiAction', 'phMinus', 'phPlus'];
        const productNames = {
            chloroShock: 'Cloro Shock (g)',
            antiAlgae: 'Anti Alghe (ml)',
            chloroMultiAction: 'Cloro 4 Azioni',
            phMinus: 'pH Minus (g)',
            phPlus: 'pH Plus (g)'
        };
        const colors = ['#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C'];

        const datasets = productTypes.map((type, index) => ({
            label: productNames[type],
            data: this.measurements.map(m => {
                const product = m.products?.find(p => p.type === type);
                return product ? (product.quantity || 0) : 0;
            }),
            backgroundColor: colors[index],
            borderColor: colors[index],
            borderWidth: 1
        }));

        if (this.charts.products) {
            this.charts.products.destroy();
        }

        this.charts.products = new Chart(chartContext, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Prodotti Chimici Utilizzati',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Quantità'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateCharts() {
        const labels = this.measurements.map(m => this.formatDate(m.date));
        
        // Update pH/Chlorine chart
        if (this.charts.phChlorine) {
            this.charts.phChlorine.data.labels = labels;
            this.charts.phChlorine.data.datasets[0].data = this.measurements.map(m => isNaN(m.ph) ? null : m.ph);
            this.charts.phChlorine.data.datasets[1].data = this.measurements.map(m => isNaN(m.chlorine) ? null : m.chlorine);
            this.charts.phChlorine.update();
        }

        // Update products chart
        if (this.charts.products) {
            this.charts.products.data.labels = labels;
            const productTypes = ['chloroShock', 'antiAlgae', 'chloroMultiAction', 'phMinus', 'phPlus'];
            productTypes.forEach((type, index) => {
                this.charts.products.data.datasets[index].data = this.measurements.map(m => {
                    const product = m.products?.find(p => p.type === type);
                    return product ? (product.quantity || 0) : 0;
                });
            });
            this.charts.products.update();
        }
    }

    updateActionRecommendation() {
        const latest = this.measurements[this.measurements.length - 1];
        const actionText = document.getElementById('action-text');
        
        if (!latest || !actionText) {
            if (actionText) {
                actionText.textContent = 'Inserisci le prime misurazioni per ricevere consigli personalizzati.';
            }
            return;
        }

        let recommendations = [];

        // Check pH
        if (!isNaN(latest.ph)) {
            if (latest.ph < this.optimumValues.ph.min) {
                recommendations.push('Il pH è troppo basso. Aggiungi pH Plus (110-165g per la tua piscina da 55m³).');
            } else if (latest.ph > this.optimumValues.ph.max) {
                recommendations.push('Il pH è troppo alto. Aggiungi pH Minus (110-165g per la tua piscina da 55m³).');
            }
        }

        // Check chlorine
        if (!isNaN(latest.chlorine)) {
            if (latest.chlorine < this.optimumValues.chlorine.min) {
                recommendations.push('Il cloro è troppo basso. Aggiungi Cloro Shock (550-825g) o Cloro 4 Azioni (2-3 pastiglie) per la tua piscina da 55m³.');
            } else if (latest.chlorine > this.optimumValues.chlorine.max) {
                recommendations.push('Il cloro è troppo alto. Sospendi l\'aggiunta di cloro e controlla la filtrazione.');
            }
        }

        // General maintenance recommendations
        if (recommendations.length === 0) {
            recommendations.push('I valori sono ottimali! Continua con la manutenzione regolare. Aggiungi Anti Alghe (275ml) settimanalmente per la tua piscina da 55m³.');
        }

        actionText.textContent = recommendations.join(' ');
    }

    showConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            this.updateCurrentDateDisplay();
            modal.classList.add('show');
            
            // Focus sul pulsante di annullamento per accessibilità
            const cancelBtn = document.getElementById('cancel-delete');
            if (cancelBtn) {
                setTimeout(() => cancelBtn.focus(), 100);
            }
        }
    }

    hideConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    clearHistoricalData() {
        const today = new Date().toISOString().split('T')[0];
        const originalCount = this.measurements.length;
        
        // Mantieni solo i dati del giorno corrente
        this.measurements = this.measurements.filter(m => m.date === today);
        const remainingCount = this.measurements.length;
        const deletedCount = originalCount - remainingCount;
        
        this.saveMeasurements();
        this.updateCurrentStatus();
        this.renderHistoryTable();
        this.updateCharts();
        this.updateActionRecommendation();
        this.updateDataCount();
        
        // Messaggio più dettagliato
        if (deletedCount > 0) {
            this.showToast(`Eliminati ${deletedCount} record storici. Mantenuti ${remainingCount} record del giorno corrente.`, 'success');
        } else {
            this.showToast('Nessun dato storico da eliminare. Sono presenti solo dati del giorno corrente.', 'info');
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 350px;
            word-wrap: break-word;
        `;

        // Set background color based on type
        switch(type) {
            case 'success':
                toast.style.background = '#4caf50';
                break;
            case 'error':
                toast.style.background = '#f44336';
                break;
            case 'warning':
                toast.style.background = '#ff9800';
                break;
            default:
                toast.style.background = '#2196f3';
        }

        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js non è stato caricato correttamente');
        return;
    }

    // Initialize the pool monitor
    try {
        new PoolMonitor();
    } catch (error) {
        console.error('Errore nell\'inizializzazione dell\'applicazione:', error);
    }
});