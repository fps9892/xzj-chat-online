import { database, db, currentUser, currentRoom, checkAdminStatus } from './firebase.js';
import { ref, push, onValue, set, serverTimestamp, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
    const pollsBtn = document.querySelector('.polls-btn');
    const pollsPanelOverlay = document.getElementById('pollsPanelOverlay');
    const closePollsPanel = document.querySelector('.close-polls-panel');
    const pollsTabs = document.querySelectorAll('.polls-tab');
    const pollsList = document.querySelector('.polls-list[data-section="active"]');
    const pollsCreate = document.querySelector('.polls-create[data-section="create"]');
    const addOptionBtn = document.querySelector('.add-option-btn');
    const createPollBtn = document.querySelector('.create-poll-btn');
    const pollQuestion = document.querySelector('.poll-question');
    const pollOptionsContainer = document.querySelector('.poll-options');
    
    if (!pollsBtn) return;
    
    // Abrir panel
    pollsBtn.addEventListener('click', () => {
        pollsPanelOverlay.classList.add('active');
        loadActivePolls();
    });
    
    // Cerrar panel
    closePollsPanel.addEventListener('click', () => {
        pollsPanelOverlay.classList.remove('active');
    });
    
    pollsPanelOverlay.addEventListener('click', (e) => {
        if (e.target === pollsPanelOverlay) {
            pollsPanelOverlay.classList.remove('active');
        }
    });
    
    // Tabs
    pollsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            
            pollsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (tabType === 'active') {
                pollsList.classList.add('active');
                pollsCreate.classList.remove('active');
                loadActivePolls();
            } else {
                pollsList.classList.remove('active');
                pollsCreate.classList.add('active');
            }
        });
    });
    
    // Añadir opción
    addOptionBtn.addEventListener('click', () => {
        const optionCount = pollOptionsContainer.querySelectorAll('.poll-option').length;
        if (optionCount >= 6) {
            showNotification('Máximo 6 opciones permitidas', 'warning');
            return;
        }
        
        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.className = 'poll-option';
        newOption.placeholder = `Opción ${optionCount + 1}`;
        newOption.maxLength = 50;
        pollOptionsContainer.appendChild(newOption);
    });
    
    // Crear encuesta
    createPollBtn.addEventListener('click', async () => {
        if (currentUser.isGuest) {
            showNotification('Solo usuarios registrados pueden crear encuestas', 'error');
            return;
        }
        
        const question = pollQuestion.value.trim();
        if (!question) {
            showNotification('Ingresa una pregunta', 'error');
            return;
        }
        
        const options = Array.from(pollOptionsContainer.querySelectorAll('.poll-option'))
            .map(input => input.value.trim())
            .filter(val => val !== '');
        
        if (options.length < 2) {
            showNotification('Mínimo 2 opciones requeridas', 'error');
            return;
        }
        
        try {
            const pollId = `poll-${Date.now()}`;
            const expiresAt = Date.now() + (30 * 60 * 1000);
            const pollData = {
                question: question,
                options: options.map(opt => ({ text: opt, votes: 0 })),
                createdBy: currentUser.firebaseUid,
                createdByName: currentUser.username,
                room: currentRoom,
                createdAt: Date.now(),
                expiresAt: expiresAt,
                voters: []
            };
            
            await setDoc(doc(db, 'polls', pollId), pollData);
            
            showNotification('Encuesta creada exitosamente', 'success');
            pollQuestion.value = '';
            pollOptionsContainer.innerHTML = `
                <input type="text" class="poll-option" placeholder="Opción 1" maxlength="50" />
                <input type="text" class="poll-option" placeholder="Opción 2" maxlength="50" />
            `;
            
            pollsTabs[0].click();
        } catch (error) {
            console.error('Error creating poll:', error);
            showNotification('Error al crear encuesta', 'error');
        }
    });
    
    async function loadActivePolls() {
        try {
            const pollsQuery = query(collection(db, 'polls'), where('room', '==', currentRoom));
            const pollsSnapshot = await getDocs(pollsQuery);
            
            pollsList.innerHTML = '';
            const now = Date.now();
            let hasActivePolls = false;
            
            for (const docSnapshot of pollsSnapshot.docs) {
                const pollData = docSnapshot.data();
                const pollId = docSnapshot.id;
                
                if (pollData.expiresAt && pollData.expiresAt < now) {
                    await deleteDoc(doc(db, 'polls', pollId));
                    continue;
                }
                
                hasActivePolls = true;
                renderPoll(pollId, pollData);
            }
            
            if (!hasActivePolls) {
                pollsList.innerHTML = '<div class="empty-polls">No hay encuestas activas</div>';
            }
        } catch (error) {
            console.error('Error loading polls:', error);
            pollsList.innerHTML = '<div class="empty-polls">Error al cargar encuestas</div>';
        }
    }
    
    async function renderPoll(pollId, pollData) {
        const hasVoted = pollData.voters && pollData.voters.includes(currentUser.firebaseUid);
        const totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
        const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
        
        const pollElement = document.createElement('div');
        pollElement.className = 'poll-item';
        pollElement.setAttribute('data-poll-id', pollId);
        
        const timeLeft = pollData.expiresAt ? Math.max(0, Math.floor((pollData.expiresAt - Date.now()) / 1000)) : 0;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        pollElement.innerHTML = `
            <div class="poll-header">
                <div>
                    <div class="poll-question" style="background: transparent; border: none; padding: 0; margin-bottom: 5px; font-size: 16px;">${pollData.question}</div>
                    <div class="poll-timer">⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                </div>
                ${isAdmin ? `<img src="/images/close.svg" class="delete-poll-btn" data-poll-id="${pollId}" />` : ''}
            </div>
            <div class="poll-options-list">
                ${pollData.options.map((option, index) => {
                    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                    return `
                        <div class="poll-option-item ${hasVoted ? 'voted' : ''}" data-poll-id="${pollId}" data-option-index="${index}">
                            <div class="poll-option-bar" style="width: ${percentage}%"></div>
                            <div class="poll-option-text">${option.text}</div>
                            <div class="poll-option-percentage">${percentage}% (${option.votes} votos)</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="poll-total-votes">Total: ${totalVotes} votos</div>
        `;
        
        pollsList.appendChild(pollElement);
        
        if (!hasVoted && !currentUser.isGuest) {
            pollElement.querySelectorAll('.poll-option-item').forEach(item => {
                item.addEventListener('click', () => votePoll(pollId, parseInt(item.dataset.optionIndex)));
            });
        }
        
        if (isAdmin) {
            pollElement.querySelector('.delete-poll-btn').addEventListener('click', () => deletePoll(pollId));
        }
        
        if (timeLeft > 0) {
            const interval = setInterval(async () => {
                const newTimeLeft = Math.max(0, Math.floor((pollData.expiresAt - Date.now()) / 1000));
                const newMinutes = Math.floor(newTimeLeft / 60);
                const newSeconds = newTimeLeft % 60;
                
                const timerEl = pollElement.querySelector('.poll-timer');
                if (timerEl) {
                    timerEl.textContent = `⏱️ ${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
                }
                
                if (newTimeLeft <= 0) {
                    clearInterval(interval);
                    await deleteDoc(doc(db, 'polls', pollId));
                    pollElement.remove();
                    if (pollsList.children.length === 0) {
                        pollsList.innerHTML = '<div class="empty-polls">No hay encuestas activas</div>';
                    }
                }
            }, 1000);
        }
    }
    
    // Votar en encuesta
    async function votePoll(pollId, optionIndex) {
        if (currentUser.isGuest) {
            showNotification('Solo usuarios registrados pueden votar', 'error');
            return;
        }
        
        try {
            const pollRef = doc(db, 'polls', pollId);
            const pollDoc = await getDoc(pollRef);
            
            if (!pollDoc.exists()) {
                showNotification('Encuesta no encontrada', 'error');
                return;
            }
            
            const pollData = pollDoc.data();
            
            if (pollData.voters && pollData.voters.includes(currentUser.firebaseUid)) {
                showNotification('Ya has votado en esta encuesta', 'warning');
                return;
            }
            
            const updatedOptions = [...pollData.options];
            updatedOptions[optionIndex].votes += 1;
            
            const updatedVoters = [...(pollData.voters || []), currentUser.firebaseUid];
            
            await updateDoc(pollRef, {
                options: updatedOptions,
                voters: updatedVoters
            });
            
            showNotification('Voto registrado exitosamente', 'success');
            loadActivePolls();
        } catch (error) {
            console.error('Error voting:', error);
            showNotification('Error al votar', 'error');
        }
    }
    
    async function deletePoll(pollId) {
        if (!confirm('¿Eliminar esta encuesta?')) return;
        
        try {
            await deleteDoc(doc(db, 'polls', pollId));
            showNotification('Encuesta eliminada', 'success');
            loadActivePolls();
        } catch (error) {
            console.error('Error deleting poll:', error);
            showNotification('Error al eliminar encuesta', 'error');
        }
    }
    
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});
