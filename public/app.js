// Pool Monitor Advanced - JavaScript
class PoolMonitor {
    constructor() {
        this.storageKey = 'misurazioniPiscina';
        this.data = this.loadData();
        this.combinedChart = null;
        this.maintenanceChart = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStatusCards();
        this.renderCharts();
        this.renderCronologia();
    }

    bindEvents() {
        // Form submission
        document.getElementById('formMisurazione').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });

        // Elimina storico button
        document.getElementById('eliminaStoricoBtn').addEventListener('click', () => {
            this.eliminaStorico();
        });
    }

    handleFormSubmit(e) {
        const formData = new FormData(e.target);
        const nuovaMisurazione = {
            data: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            ph: parseFloat(formData.get('ph')),
            cloro: parseFloat(formData.get('cloro')),
            prodotti: {
                cloroShock: parseInt(formData.get('cloroShock')) || 0,
                antiAlghe: parseFloat(formData.get('antiAlghe')) || 0,
                cloro4Azioni: parseInt(formData.get('cloro4Azioni')) || 0,
                phMinus: parseFloat(formData.get('phMinus')) || 0,  // litri
                phPlus: parseFloat(formData.get('phPlus')) || 0     // litri
            }
        };

        // Validazione
        if (!this.validateMeasurement(nuovaMisurazione)) {
            return;
        }

        // Rimuovi eventuale misurazione esistente per oggi
        this.data = this.data.filter(m => m.data !== nuovaMisurazione.data);
        
        // Aggiungi nuova misurazione
        this.data.push(nuovaMisurazione);
        this.data.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        this.saveData();
        this.updateStatusCards();
        this.renderCharts();
        this.renderCronologia();
        
        // Reset form
        e.target.reset();
        
        this.showNotification('Misurazione salvata con successo!', 'success');
    }

    validateMeasurement(measurement) {
        // Validazione pH
        if (measurement.ph < 6.0 || measurement.ph > 8.5) {
            this.showNotification('Il pH deve essere compreso tra 6.0 e 8.5', 'error');
            return false;
        }

        // Validazione cloro
        if (measurement.cloro < 0 || measurement.cloro > 5) {
            this.showNotification('Il cloro deve essere compreso tra 0 e 5 ppm', 'error');
            return false;
        }

        return true;
    }

    eliminaStorico() {
        const oggi = new Date().toISOString().split('T')[0];
        const datiOggi = this.data.filter(m => m.data === oggi);
        const datiStorici = this.data.filter(m => m.data !== oggi);

        if (datiStorici.length === 0) {
            this.showNotification('Nessun dato storico da eliminare', 'warning');
            return;
        }

        const conferma = confirm(
            `Sei sicuro di voler eliminare ${datiStorici.length} giorni di dati storici?\n` +
            `Verranno mantenute solo le misurazioni di oggi (${datiOggi.length} record).`
        );

        if (conferma) {
            this.data = datiOggi;
            this.saveData();
            this.updateStatusCards();
            this.renderCharts();
            this.renderCronologia();
            this.showNotification('Dati storici eliminati con successo!', 'success');
        }
    }

    updateStatusCards() {
        const ultimaMisurazione = this.data[this.data.length - 1];
        
        if (ultimaMisurazione) {
            // Aggiorna pH
            document.getElementById('phValue').textContent = ultimaMisurazione.ph.toFixed(1);
            document.getElementById('phIndicator').textContent = this.getPhStatus(ultimaMisurazione.ph);
            document.getElementById('phIndicator').className = 'status-indicator ' + this.getPhStatusClass(ultimaMisurazione.ph);

            // Aggiorna cloro
            document.getElementById('cloroValue').textContent = ultimaMisurazione.cloro.toFixed(1) + ' ppm';
            document.getElementById('cloroIndicator').textContent = this.getCloroStatus(ultimaMisurazione.cloro);
            document.getElementById('cloroIndicator').className = 'status-indicator ' + this.getCloroStatusClass(ultimaMisurazione.cloro);
        } else {
            // Valori di default
            document.getElementById('phValue').textContent = '--';
            document.getElementById('phIndicator').textContent = 'Nessun dato';
            document.getElementById('cloroValue').textContent = '--';
            document.getElementById('cloroIndicator').textContent = 'Nessun dato';
        }
    }

    getPhStatus(ph) {
        if (ph >= 7.2 && ph <= 7.6) return 'Ottimale';
        if (ph >= 7.0 && ph <= 7.8) return 'Accettabile';
        return 'Da correggere';
    }

    getPhStatusClass(ph) {
        if (ph >= 7.2 && ph <= 7.6) return 'optimal';
        if (ph >= 7.0 && ph <= 7.8) return 'warning';
        return 'danger';
    }

    getCloroStatus(cloro) {
        if (cloro >= 1.0 && cloro <= 1.5) return 'Ottimale';
        if (cloro >= 0.5 && cloro <= 2.0) return 'Accettabile';
        return 'Da correggere';
    }

    getCloroStatusClass(cloro) {
        if (cloro >= 1.0 && cloro <= 1.5) return 'optimal';
        if (cloro >= 0.5 && cloro <= 2.0) return 'warning';
        return 'danger';
    }

    renderCharts() {
        this.renderCombinedChart();
        this.renderMaintenanceChart();
    }

    renderCombinedChart() {
        const ctx = document.getElementById('combinedChart').getContext('2d');
        
        if (this.combinedChart) {
            this.combinedChart.destroy();
        }

        const labels = this.data.map(d => this.formatDate(d.data));
        const phData = this.data.map(d => d.ph);
        const cloroData = this.data.map(d => d.cloro);

        this.combinedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'pH',
                    data: phData,
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Cloro (ppm)',
                    data: cloroData,
                    borderColor: '#388e3c',
                    backgroundColor: 'rgba(56, 142, 60, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Andamento pH e Cloro nel Tempo'
                    },
                    legend: {
                        display: true,
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
                        max: 3,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    renderMaintenanceChart() {
        const ctx = document.getElementById('maintenanceChart').getContext('2d');
        
        if (this.maintenanceChart) {
            this.maintenanceChart.destroy();
        }

        const labels = this.data.map(d => this.formatDate(d.data));
        const cloroShockData = this.data.map(d => d.prodotti.cloroShock);
        const antiAlgheData = this.data.map(d => d.prodotti.antiAlghe);
        const cloro4AzioniData = this.data.map(d => d.prodotti.cloro4Azioni);
        const phMinusData = this.data.map(d => d.prodotti.phMinus);
        const phPlusData = this.data.map(d => d.prodotti.phPlus);

        this.maintenanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cloro Shock (g)',
                    data: cloroShockData,
                    backgroundColor: 'rgba(255, 193, 7, 0.8)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 1
                }, {
                    label: 'Anti Alghe (l)',
                    data: antiAlgheData,
                    backgroundColor: 'rgba(76, 175, 80, 0.8)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }, {
                    label: 'Cloro 4 Azioni (pastiglie)',
                    data: cloro4AzioniData,
                    backgroundColor: 'rgba(33, 150, 243, 0.8)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1
                }, {
                    label: 'pH Minus (l)',
                    data: phMinusData,
                    backgroundColor: 'rgba(244, 67, 54, 0.8)',
                    borderColor: 'rgba(244, 67, 54, 1)',
                    borderWidth: 1
                }, {
                    label: 'pH Plus (l)',
                    data: phPlusData,
                    backgroundColor: 'rgba(156, 39, 176, 0.8)',
                    borderColor: 'rgba(156, 39, 176, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Utilizzo Prodotti Chimici per Data'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
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

    renderCronologia() {
        const container = document.getElementById('cronologia');
        
        if (this.data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">Nessuna misurazione registrata</p>';
            return;
        }

        const ultimi10 = this.data.slice(-10).reverse();
        
        const html = ultimi10.map(misurazione => {
            const prodottiUsati = this.formatProdotti(misurazione.prodotti);
            return `
                <div class="cronologia-item">
                    <div class="cronologia-date">${this.formatDate(misurazione.data)}</div>
                    <div class="cronologia-values">
                        pH: <strong>${misurazione.ph.toFixed(1)}</strong> | 
                        Cloro: <strong>${misurazione.cloro.toFixed(1)} ppm</strong>
                    </div>
                    <div class="cronologia-products">${prodottiUsati}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    formatProdotti(prodotti) {
        const used = [];
        if (prodotti.cloroShock > 0) used.push(`Cloro Shock: ${prodotti.cloroShock}g`);
        if (prodotti.antiAlghe > 0) used.push(`Anti Alghe: ${prodotti.antiAlghe}l`);
        if (prodotti.cloro4Azioni > 0) used.push(`Cloro 4A: ${prodotti.cloro4Azioni}p`);
        if (prodotti.phMinus > 0) used.push(`pH Minus: ${prodotti.phMinus}l`);
        if (prodotti.phPlus > 0) used.push(`pH Plus: ${prodotti.phPlus}l`);
        
        return used.length > 0 ? used.join(', ') : 'Nessun prodotto utilizzato';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: '2-digit',
            year: '2-digit'
        });
    }

    showNotification(message, type = 'info') {
        // Rimuovi notifiche esistenti
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Crea nuova notifica
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        
        // Styles inline per la notifica
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '9999',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease-out'
        });

        // Colori per tipo
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animazione di entrata
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Rimozione automatica
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            return [];
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Errore nel salvataggio dei dati:', error);
            this.showNotification('Errore nel salvataggio dei dati', 'error');
        }
    }

    // Metodi utility per debug e esportazione
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pool-monitor-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Dati esportati con successo!', 'success');
    }

    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            if (Array.isArray(importedData)) {
                this.data = importedData;
                this.saveData();
                this.updateStatusCards();
                this.renderCharts();
                this.renderCronologia();
                this.showNotification('Dati importati con successo!', 'success');
            } else {
                throw new Error('Formato dati non valido');
            }
        } catch (error) {
            console.error('Errore nell\\'importazione:', error);
            this.showNotification('Errore nell\\'importazione dei dati', 'error');
        }
    }

    clearAllData() {
        if (confirm('Sei sicuro di voler eliminare TUTTI i dati? Questa operazione non può essere annullata.')) {
            this.data = [];
            this.saveData();
            this.updateStatusCards();
            this.renderCharts();
            this.renderCronologia();
            this.showNotification('Tutti i dati sono stati eliminati', 'warning');
        }
    }
}

// Inizializzazione dell'applicazione
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza Pool Monitor
    window.poolMonitor = new PoolMonitor();
    
    // Aggiungi metodi di debug al console per sviluppo
    if (typeof window !== 'undefined') {
        window.poolDebug = {
            export: () => window.poolMonitor.exportData(),
            clear: () => window.poolMonitor.clearAllData(),
            getData: () => window.poolMonitor.data,
            addSampleData: () => {
                const sampleData = [
                    {
                        data: '2024-01-01',
                        timestamp: '2024-01-01T10:00:00.000Z',
                        ph: 7.4,
                        cloro: 1.2,
                        prodotti: { cloroShock: 0, antiAlghe: 0.1, cloro4Azioni: 1, phMinus: 0, phPlus: 0.05 }
                    },
                    {
                        data: '2024-01-02',
                        timestamp: '2024-01-02T10:00:00.000Z',
                        ph: 7.3,
                        cloro: 1.0,
                        prodotti: { cloroShock: 200, antiAlghe: 0, cloro4Azioni: 0, phMinus: 0.1, phPlus: 0 }
                    }
                ];
                window.poolMonitor.data = sampleData;
                window.poolMonitor.saveData();
                window.poolMonitor.updateStatusCards();
                window.poolMonitor.renderCharts();
                window.poolMonitor.renderCronologia();
                window.poolMonitor.showNotification('Dati di esempio aggiunti!', 'success');
            }
        };
    }

    console.log('Pool Monitor Advanced inizializzato con successo!');
    console.log('Comandi debug disponibili: poolDebug.export(), poolDebug.clear(), poolDebug.addSampleData()');
});