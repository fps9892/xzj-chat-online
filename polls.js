import { database, db, currentUser, currentRoom } from './firebase.js';
import { ref, push, onValue, set, serverTimestamp, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
            const pollData = {
                question: question,
                options: options.map(opt => ({ text: opt, votes: 0 })),
                createdBy: currentUser.firebaseUid,
                createdByName: currentUser.username,
                room: currentRoom,
                createdAt: new Date().toISOString(),
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
    
    // Cargar encuestas activas
    async function loadActivePolls() {
        try {
            const pollsQuery = query(collection(db, 'polls'), where('room', '==', currentRoom));
            const pollsSnapshot = await getDocs(pollsQuery);
            
            if (pollsSnapshot.empty) {
                pollsList.innerHTML = '<div class="empty-polls">No hay encuestas activas</div>';
                return;
            }
            
            pollsList.innerHTML = '';
            
            pollsSnapshot.forEach((docSnapshot) => {
                const pollData = docSnapshot.data();
                const pollId = docSnapshot.id;
                renderPoll(pollId, pollData);
            });
        } catch (error) {
            console.error('Error loading polls:', error);
            pollsList.innerHTML = '<div class="empty-polls">Error al cargar encuestas</div>';
        }
    }
    
    // Renderizar encuesta
    function renderPoll(pollId, pollData) {
        const hasVoted = pollData.voters && pollData.voters.includes(currentUser.firebaseUid);
        const totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        const pollElement = document.createElement('div');
        pollElement.className = 'poll-item';
        pollElement.innerHTML = `
            <div class="poll-question" style="background: transparent; border: none; padding: 0; margin-bottom: 15px; font-size: 16px;">${pollData.question}</div>
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
        
        // Event listeners para votar
        if (!hasVoted && !currentUser.isGuest) {
            pollElement.querySelectorAll('.poll-option-item').forEach(item => {
                item.addEventListener('click', () => votePoll(pollId, parseInt(item.dataset.optionIndex)));
            });
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
