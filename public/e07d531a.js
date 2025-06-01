// Pool Monitor Advanced - JavaScript
// Gestione completa dell'applicazione per monitoraggio piscina

class PoolMonitor {
    constructor() {
        this.misurazioni = JSON.parse(localStorage.getItem('misurazioniPiscina')) || [];
        this.combinedChart = null;
        this.maintenanceChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.aggiornaStatusCards();
        this.aggiornaGrafici();
        this.aggiornaCronologia();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('formMisurazione').addEventListener('submit', (e) => {
            this.handleFormSubmission(e);
        });

        // Elimina storico button
        document.getElementById('eliminaStoricoBtn').addEventListener('click', () => {
            this.eliminaStorico();
        });
    }

    handleFormSubmission(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const nuovaMisurazione = {
            data: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            ph: parseFloat(formData.get('ph')),
            cloro: parseFloat(formData.get('cloro')),
            prodotti: {
                cloroShock: parseInt(formData.get('cloroShock')) || 0,        // grammi
                antiAlghe: parseFloat(formData.get('antiAlghe')) || 0,         // litri
                cloro4Azioni: parseInt(formData.get('cloro4Azioni')) || 0,    // pastiglie
                phMinus: parseInt(formData.get('phMinus')) || 0,               // grammi (modificato)
                phPlus: parseInt(formData.get('phPlus')) || 0                  // grammi (modificato)
            }
        };

        // Validazione dati
        if (this.validaDati(nuovaMisurazione)) {
            // Rimuovi eventuale misurazione esistente per oggi
            const oggi = nuovaMisurazione.data;
            this.misurazioni = this.misurazioni.filter(m => m.data !== oggi);
            
            // Aggiungi nuova misurazione
            this.misurazioni.push(nuovaMisurazione);
            
            // Ordina per data
            this.misurazioni.sort((a, b) => new Date(a.data) - new Date(b.data));
            
            // Salva in localStorage
            localStorage.setItem('misurazioniPiscina', JSON.stringify(this.misurazioni));
            
            // Aggiorna UI
            this.aggiornaStatusCards();
            this.aggiornaGrafici();
            this.aggiornaCronologia();
            
            // Reset form
            e.target.reset();
            
            // Feedback utente
            this.mostraNotifica('✅ Misurazione salvata con successo!', 'success');
        }
    }

    validaDati(misurazione) {
        if (misurazione.ph < 6.0 || misurazione.ph > 8.5) {
            this.mostraNotifica('⚠️ Valore pH fuori range (6.0-8.5)', 'warning');
            return false;
        }
        
        if (misurazione.cloro < 0 || misurazione.cloro > 5) {
            this.mostraNotifica('⚠️ Valore cloro fuori range (0-5 ppm)', 'warning');
            return false;
        }
        
        return true;
    }

    eliminaStorico() {
        const conferma = confirm(
            `⚠️ ATTENZIONE: Verranno eliminati TUTTI i dati precedenti a oggi.\n\n` +
            `Misurazioni da eliminare: ${this.misurazioni.filter(m => m.data !== new Date().toISOString().split('T')[0]).length}\n` +
            `Misurazioni che rimarranno: ${this.misurazioni.filter(m => m.data === new Date().toISOString().split('T')[0]).length}\n\n` +
            `Questa operazione non può essere annullata. Confermi?`
        );

        if (conferma) {
            const oggi = new Date().toISOString().split('T')[0];
            const datiOriginali = this.misurazioni.length;
            
            this.misurazioni = this.misurazioni.filter(m => m.data === oggi);
            localStorage.setItem('misurazioniPiscina', JSON.stringify(this.misurazioni));
            
            const datiEliminati = datiOriginali - this.misurazioni.length;
            
            this.aggiornaStatusCards();
            this.aggiornaGrafici();
            this.aggiornaCronologia();
            
            this.mostraNotifica(
                `✅ Storico eliminato! Eliminati ${datiEliminati} record. Rimangono ${this.misurazioni.length} record di oggi.`, 
                'success'
            );
        }
    }

    aggiornaStatusCards() {
        const ultimaMisurazione = this.misurazioni[this.misurazioni.length - 1];
        
        if (ultimaMisurazione) {
            // Aggiorna pH
            document.getElementById('phValue').textContent = ultimaMisurazione.ph.toFixed(1);
            this.aggiornaIndicatore('phIndicator', this.valutaPH(ultimaMisurazione.ph));
            
            // Aggiorna Cloro
            document.getElementById('cloroValue').textContent = ultimaMisurazione.cloro.toFixed(1);
            this.aggiornaIndicatore('cloroIndicator', this.valutaCloro(ultimaMisurazione.cloro));
        } else {
            document.getElementById('phValue').textContent = '-';
            document.getElementById('cloroValue').textContent = '-';
            document.getElementById('phIndicator').textContent = 'Nessun dato';
            document.getElementById('cloroIndicator').textContent = 'Nessun dato';
        }
    }

    valutaPH(ph) {
        if (ph >= 7.2 && ph <= 7.6) {
            return { status: 'good', text: 'Ottimo' };
        } else if (ph >= 7.0 && ph <= 8.0) {
            return { status: 'warning', text: 'Accettabile' };
        } else {
            return { status: 'danger', text: 'Critico' };
        }
    }

    valutaCloro(cloro) {
        if (cloro >= 1.0 && cloro <= 1.5) {
            return { status: 'good', text: 'Ottimo' };
        } else if (cloro >= 0.5 && cloro <= 2.0) {
            return { status: 'warning', text: 'Accettabile' };
        } else {
            return { status: 'danger', text: 'Critico' };
        }
    }

    aggiornaIndicatore(elementId, valutazione) {
        const elemento = document.getElementById(elementId);
        elemento.textContent = valutazione.text;
        elemento.className = `status-indicator ${valutazione.status}`;
    }

    aggiornaGrafici() {
        this.creaGraficoCombinato();
        this.creaGraficoManutenzioni();
    }

    creaGraficoCombinato() {
        const ctx = document.getElementById('combinedChart').getContext('2d');
        
        if (this.combinedChart) {
            this.combinedChart.destroy();
        }

        const labels = this.misurazioni.map(m => this.formatData(m.data));
        const phData = this.misurazioni.map(m => m.ph);
        const cloroData = this.misurazioni.map(m => m.cloro);

        this.combinedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH',
                        data: phData,
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Cloro (ppm)',
                        data: cloroData,
                        borderColor: '#388e3c',
                        backgroundColor: 'rgba(56, 142, 60, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
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
                        grid: {
                            drawOnChartArea: false,
                        },
                        min: 0,
                        max: 3
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white'
                    }
                }
            }
        });
    }

    creaGraficoManutenzioni() {
        const ctx = document.getElementById('maintenanceChart').getContext('2d');
        
        if (this.maintenanceChart) {
            this.maintenanceChart.destroy();
        }

        const labels = this.misurazioni.map(m => this.formatData(m.data));
        
        this.maintenanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cloro Shock (g)',
                        data: this.misurazioni.map(m => m.prodotti.cloroShock),
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Anti Alghe (l)',
                        data: this.misurazioni.map(m => m.prodotti.antiAlghe),
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Cloro 4 Azioni (pastiglie)',
                        data: this.misurazioni.map(m => m.prodotti.cloro4Azioni),
                        backgroundColor: 'rgba(255, 206, 86, 0.7)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'pH Minus (g)',
                        data: this.misurazioni.map(m => m.prodotti.phMinus),
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'pH Plus (g)',
                        data: this.misurazioni.map(m => m.prodotti.phPlus),
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantità'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white'
                    }
                }
            }
        });
    }

    aggiornaCronologia() {
        const container = document.getElementById('cronologiaMisurazioni');
        
        if (this.misurazioni.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nessuna misurazione registrata</p>';
            return;
        }

        let html = '';
        
        // Mostra le ultime 10 misurazioni in ordine inverso
        const misurazioniRecenti = [...this.misurazioni].reverse().slice(0, 10);
        
        misurazioniRecenti.forEach(m => {
            const prodottiUsati = this.formatProdotti(m.prodotti);
            
            html += `
                <div class="history-item fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>${this.formatData(m.data)}</strong>
                        <small style="color: #666;">${this.formatTime(m.timestamp)}</small>
                    </div>
                    <div style="margin-bottom: 8px;">
                        pH: <strong style="color: ${this.getColorForPH(m.ph)}">${m.ph}</strong> | 
                        Cloro: <strong style="color: ${this.getColorForCloro(m.cloro)}">${m.cloro} ppm</strong>
                    </div>
                    <div style="font-size: 0.9rem; color: #666;">
                        <em>Prodotti utilizzati:</em> ${prodottiUsati}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    formatProdotti(prodotti) {
        const prodottiArray = [];
        
        if (prodotti.cloroShock > 0) prodottiArray.push(`Cloro Shock: ${prodotti.cloroShock}g`);
        if (prodotti.antiAlghe > 0) prodottiArray.push(`Anti Alghe: ${prodotti.antiAlghe}l`);
        if (prodotti.cloro4Azioni > 0) prodottiArray.push(`Cloro 4 Azioni: ${prodotti.cloro4Azioni} pastiglie`);
        if (prodotti.phMinus > 0) prodottiArray.push(`pH Minus: ${prodotti.phMinus}g`);
        if (prodotti.phPlus > 0) prodottiArray.push(`pH Plus: ${prodotti.phPlus}g`);
        
        return prodottiArray.length > 0 ? prodottiArray.join(', ') : 'Nessuno';
    }

    formatData(data) {
        return new Date(data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getColorForPH(ph) {
        if (ph >= 7.2 && ph <= 7.6) return '#4caf50';
        if (ph >= 7.0 && ph <= 8.0) return '#ff9800';
        return '#f44336';
    }

    getColorForCloro(cloro) {
        if (cloro >= 1.0 && cloro <= 1.5) return '#4caf50';
        if (cloro >= 0.5 && cloro <= 2.0) return '#ff9800';
        return '#f44336';
    }

    mostraNotifica(messaggio, tipo = 'info') {
        // Crea elemento notifica
        const notifica = document.createElement('div');
        notifica.className = `notifica notifica-${tipo}`;
        notifica.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Colori per tipo
        const colori = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196f3'
        };
        
        notifica.style.backgroundColor = colori[tipo] || colori.info;
        notifica.textContent = messaggio;
        
        document.body.appendChild(notifica);
        
        // Animazione di entrata
        setTimeout(() => {
            notifica.style.transform = 'translateX(0)';
        }, 100);
        
        // Rimozione automatica
        setTimeout(() => {
            notifica.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notifica.parentNode) {
                    notifica.parentNode.removeChild(notifica);
                }
            }, 300);
        }, 3000);
    }

    // Metodi utili per debug e testing
    esportaDati() {
        const dataStr = JSON.stringify(this.misurazioni, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `pool_monitor_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importaDati(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dati = JSON.parse(e.target.result);
                    this.misurazioni = dati;
                    localStorage.setItem('misurazioniPiscina', JSON.stringify(this.misurazioni));
                    this.init();
                    this.mostraNotifica('✅ Dati importati con successo!', 'success');
                } catch (error) {
                    this.mostraNotifica('❌ Errore nell\'importazione dei dati', 'error');
                }
            };
            reader.readAsText(file);
        }
    }

    // Statistiche
    getStatistiche() {
        if (this.misurazioni.length === 0) return null;
        
        const phValues = this.misurazioni.map(m => m.ph);
        const cloroValues = this.misurazioni.map(m => m.cloro);
        
        return {
            totaleMisurazioni: this.misurazioni.length,
            ph: {
                media: (phValues.reduce((a, b) => a + b) / phValues.length).toFixed(2),
                min: Math.min(...phValues).toFixed(2),
                max: Math.max(...phValues).toFixed(2)
            },
            cloro: {
                media: (cloroValues.reduce((a, b) => a + b) / cloroValues.length).toFixed(2),
                min: Math.min(...cloroValues).toFixed(2),
                max: Math.max(...cloroValues).toFixed(2)
            }
        };
    }
}

// Inizializzazione dell'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.poolMonitor = new PoolMonitor();
    
    // Aggiungi funzionalità di debug in console
    if (typeof window !== 'undefined') {
        window.poolDebug = {
            esporta: () => window.poolMonitor.esportaDati(),
            statistiche: () => console.table(window.poolMonitor.getStatistiche()),
            dati: () => window.poolMonitor.misurazioni,
            reset: () => {
                localStorage.removeItem('misurazioniPiscina');
                location.reload();
            }
        };
        
        console.log('🏊‍♂️ Pool Monitor Advanced caricato!');
        console.log('Usa poolDebug.statistiche() per vedere le statistiche');
        console.log('Usa poolDebug.esporta() per esportare i dati');
    }
});