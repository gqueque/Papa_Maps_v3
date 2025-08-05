import { db } from './firebase-config.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { collection, getDocs, doc, deleteDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const storage = getStorage();
    const eventListContainer = document.getElementById('event-list-container');
    
    // Referências aos elementos do modal de edição
    const modalEditar = document.getElementById('modalEditar');
    const formEditarEvento = document.getElementById('formEditarEvento');
    const imageEditInput = document.getElementById('edit-event-image');
    const imageEditPreview = document.getElementById('edit-image-preview');
    const closeButtons = document.querySelectorAll('.btn-close-modal');

    // Função para carregar e renderizar a lista de eventos
    async function loadAndRenderEvents() {
        eventListContainer.innerHTML = 'Carregando eventos...';
        const querySnapshot = await getDocs(collection(db, "events"));
        
        // Limpa o contêiner (removendo a mensagem de "carregando" ou os dados estáticos)
        eventListContainer.innerHTML = ''; 

        if (querySnapshot.empty) {
            eventListContainer.innerHTML = '<p>Nenhum evento cadastrado.</p>';
            return;
        }

        // Cria a estrutura da tabela uma vez
        const table = document.createElement('table');
        table.className = 'event-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Status das Notificações</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            event.id = doc.id;
            
            const dataFormatada = event.date ? new Date(event.date.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>
                    <strong>${event.eventName}</strong>
                    <small>${event.address}</small>
                </td>
                <td>
                    ${dataFormatada.replace(' ', '<br><small>')}</small>
                </td>
                <td class="notification-status">
                    <div><i class="far fa-clock pending"></i> Imediato</div>
                    <div><i class="far fa-clock pending"></i> 5 dias</div>
                    <div><i class="far fa-clock pending"></i> 1 dia</div>
                </td>
                <td class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${event.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" data-id="${event.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });

        eventListContainer.appendChild(table);
    }
    
    // Lógica para a prévia da nova imagem no modal de edição
    imageEditInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageEditPreview.src = event.target.result;
                imageEditPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    function closeModal() {
        if(modalEditar) modalEditar.classList.add('hidden');
        imageEditPreview.style.display = 'none';
        formEditarEvento.reset();
    }

    // Event listener principal para os botões de Ação (Editar e Excluir)
    eventListContainer.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit');
        if (editButton) {
            const eventId = editButton.dataset.id;
            const eventRef = doc(db, "events", eventId);
            const docSnap = await getDoc(eventRef);

            if (docSnap.exists()) {
                const event = docSnap.data();
                
                formEditarEvento['edit-event-id'].value = eventId;
                formEditarEvento['edit-event-name'].value = event.eventName;
                formEditarEvento['edit-event-address'].value = event.address;
                formEditarEvento['edit-event-ticket-link'].value = event.ticketLink || '';
                formEditarEvento['edit-event-old-image-url'].value = event.imageUrl || '';
                
                if (event.imageUrl) {
                    imageEditPreview.src = event.imageUrl;
                    imageEditPreview.style.display = 'block';
                } else {
                    imageEditPreview.style.display = 'none';
                }
                
                if (event.date && event.date.seconds) {
                    const eventDate = new Date(event.date.seconds * 1000);
                    const timezoneOffset = eventDate.getTimezoneOffset() * 60000;
                    const localDate = new Date(eventDate.getTime() - timezoneOffset);
                    formEditarEvento['edit-event-date'].value = localDate.toISOString().slice(0, 16);
                }
                
                modalEditar.classList.remove('hidden');
            }
        }

        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const eventId = deleteButton.dataset.id;
            const result = await Swal.fire({
                title: 'Tem certeza?',
                text: "Esta ação não pode ser desfeita!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    const eventRef = doc(db, "events", eventId);
                    const docSnap = await getDoc(eventRef);
                    if (docSnap.exists() && docSnap.data().imageUrl) {
                        const oldImageRef = ref(storage, docSnap.data().imageUrl);
                        await deleteObject(oldImageRef).catch(err => console.warn("Imagem antiga não encontrada para deletar:", err));
                    }

                    await deleteDoc(doc(db, "events", eventId));
                    Swal.fire('Excluído!', 'O evento foi removido.', 'success');
                    loadAndRenderEvents(); // Recarrega a lista
                } catch (error) {
                    console.error("Erro ao excluir evento:", error);
                    Swal.fire('Erro!', 'Não foi possível remover o evento.', 'error');
                }
            }
        }
    });

    // Lógica para salvar as alterações do formulário de edição
    formEditarEvento.addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventId = formEditarEvento['edit-event-id'].value;
        const oldImageUrl = formEditarEvento['edit-event-old-image-url'].value;
        const newImageFile = imageEditInput.files[0];
        const eventRef = doc(db, "events", eventId);

        Swal.fire({ title: 'Salvando alterações...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            let finalImageUrl = oldImageUrl;

            if (newImageFile) {
                const newStorageRef = ref(storage, `event_images/${Date.now()}_${newImageFile.name}`);
                const uploadTask = uploadBytesResumable(newStorageRef, newImageFile);
                await uploadTask;
                finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);

                if (oldImageUrl) {
                    const oldImageRef = ref(storage, oldImageUrl);
                    await deleteObject(oldImageRef).catch(err => console.warn("Imagem antiga não encontrada para deletar:", err));
                }
            }

            const updatedData = {
                eventName: formEditarEvento['edit-event-name'].value,
                address: formEditarEvento['edit-event-address'].value,
                date: new Date(formEditarEvento['edit-event-date'].value),
                ticketLink: formEditarEvento['edit-event-ticket-link'].value || null,
                imageUrl: finalImageUrl
            };

            await updateDoc(eventRef, updatedData);
            
            Swal.fire('Sucesso!', 'Evento atualizado com sucesso.', 'success');
            closeModal();
            loadAndRenderEvents();

        } catch (error) {
            console.error("Erro ao atualizar evento: ", error);
            Swal.fire('Erro!', 'Não foi possível atualizar o evento.', 'error');
        }
    });

    closeButtons.forEach(button => button.addEventListener('click', closeModal));

    loadAndRenderEvents();
});