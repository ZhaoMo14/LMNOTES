// API 基础 URL (根据需要调整)
const API_BASE_URL = '/api/v1/notes';

// DOM 元素引用 (后面会添加更多)
const notesList = document.getElementById('notesList');
const noteIdInput = document.getElementById('noteId');
const noteTitleInput = document.getElementById('noteTitle');
const noteDescriptionInput = document.getElementById('noteDescription');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsList = document.getElementById('searchResults');
const askInput = document.getElementById('askInput');
const askBtn = document.getElementById('askBtn');
const askAnswerDiv = document.getElementById('askAnswer');
const askSourcesList = document.getElementById('askSources');

// --- 笔记列表功能 ---

// 获取所有笔记并显示
// 注意：这个函数现在由Vue接管，不再直接调用
async function fetchAndDisplayNotes() {
    console.log('注意: 笔记列表已由Vue接管');
    // Vue版本会自动加载笔记，这里不再执行DOM操作
    return;
    
    /* 以下代码已由Vue接管
    console.log('Fetching notes...');
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const notes = await response.json();
        console.log('Notes received:', notes);

        notesList.innerHTML = ''; // 清空现有列表

        if (notes.length === 0) {
            const li = document.createElement('li');
            li.className = 'note-item';
            li.innerHTML = '<em>没有笔记</em>';
            notesList.appendChild(li);
            return;
        }

        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'note-item';
            // 使用 note.id 而不是 note._id
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <strong>${note.title}</strong>
                    <span class="badge bg-light text-dark">ID: ${note.id.substring(0, 6)}...</span>
                </div>
            `;
            li.dataset.noteId = note.id; // 将 ID 存储在 data 属性中
            li.dataset.title = note.title;
            li.dataset.description = note.description;

            // 添加点击事件监听器，用于加载笔记到编辑表单
            li.addEventListener('click', () => {
                // 使用 note.id 而不是 note._id
                populateEditForm(note.id, note.title, note.description);
                
                // 添加活跃状态
                document.querySelectorAll('.note-item').forEach(item => {
                    item.classList.remove('active');
                    item.style.backgroundColor = '';
                });
                li.classList.add('active');
                li.style.backgroundColor = '#e0eeff';
            });

            notesList.appendChild(li);
        });
    } catch (error) {
        console.error('获取笔记失败:', error);
        notesList.innerHTML = '<li class="note-item"><em>加载笔记失败</em></li>';
    }
    */
}

// --- 创建/编辑笔记功能 ---

// 将笔记信息填充到编辑表单
// 注意：此功能现在由Vue的selectNote方法接管
function populateEditForm(id, title, description) {
    console.log('注意: 填充表单功能已由Vue接管');
    // 通过Vue更新数据
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.selectNote) {
            vueApp.selectNote({id, title, description});
            return;
        }
    }
    
    // 如果Vue不可用，则使用原始方式更新
    noteIdInput.value = id;
    noteTitleInput.value = title;
    noteDescriptionInput.value = description;
    deleteNoteBtn.style.display = 'inline-block';
}

// 清空编辑表单
// 注意：此功能现在由Vue的clearForm方法接管
function clearEditForm() {
    console.log('注意: 清空表单功能已由Vue接管');
    // 通过Vue清空表单
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.clearForm) {
            vueApp.clearForm();
            return;
        }
    }
    
    // 如果Vue不可用，则使用原始方式清空
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteDescriptionInput.value = '';
    deleteNoteBtn.style.display = 'none';
    
    // 清除笔记列表中的活跃状态
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
        item.style.backgroundColor = '';
    });
}

// 保存笔记（创建或更新）
// 注意：此功能现在由Vue的saveNote方法接管
async function saveNote() {
    console.log('注意: 保存笔记功能已由Vue接管');
    // 通过Vue保存笔记
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.saveNote) {
            vueApp.saveNote();
            return;
        }
    }
    
    // 以下代码已由Vue接管
    /* 
    const id = noteIdInput.value;
    const title = noteTitleInput.value.trim();
    const description = noteDescriptionInput.value.trim();

    if (!title) {
        alert('标题不能为空！');
        return;
    }

    const noteData = { title, description };
    const isUpdating = !!id;
    const url = isUpdating ? `${API_BASE_URL}/${id}` : `${API_BASE_URL}/`;
    const method = isUpdating ? 'PUT' : 'POST';

    console.log(`${isUpdating ? 'Updating' : 'Creating'} note...`, noteData);
    
    // 显示加载状态
    saveNoteBtn.disabled = true;
    saveNoteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(noteData),
        });

        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`);
        }

        console.log('Note saved successfully');
        clearEditForm();
        
        // 使用Vue重新加载笔记列表
        if (window.app && app._instance) {
            const vueApp = app._instance.proxy;
            if (vueApp && vueApp.fetchNotes) {
                vueApp.fetchNotes();
            }
        }

    } catch (error) {
        console.error('保存笔记失败:', error);
        alert(`保存笔记失败: ${error.message}`);
    } finally {
        // 恢复按钮状态
        saveNoteBtn.disabled = false;
        saveNoteBtn.innerHTML = '<i class="bi bi-save"></i> 保存笔记';
    }
    */
}

// --- 删除笔记功能 ---
// 注意：此功能现在由Vue的deleteNote方法接管
async function deleteNoteById(id) {
    console.log('注意: 删除笔记功能已由Vue接管');
    // 通过Vue删除笔记
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.deleteNote) {
            vueApp.deleteNote();
            return;
        }
    }
    
    // 以下代码已由Vue接管
    /*
    if (!id) {
         alert('没有选择要删除的笔记');
         return;
     }
     if (!confirm(`确定要删除笔记 ${id} 吗？`)) {
         return;
     }

     console.log(`Deleting note ${id}...`);
     
     // 显示加载状态
     deleteNoteBtn.disabled = true;
     deleteNoteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 删除中...';

     try {
         const response = await fetch(`${API_BASE_URL}/${id}`, {
             method: 'DELETE',
         });

         // 204 No Content 也算 ok
         if (!response.ok && response.status !== 204) {
             const errorData = await response.json();
             throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Note not found'}`);
         }

         console.log('Note deleted successfully');
         clearEditForm(); // 如果当前编辑的是它，清空表单
         
         // 使用Vue重新加载笔记列表
         if (window.app && app._instance) {
            const vueApp = app._instance.proxy;
            if (vueApp && vueApp.fetchNotes) {
                vueApp.fetchNotes();
            }
         }

     } catch (error) {
         console.error('删除笔记失败:', error);
         alert(`删除笔记失败: ${error.message}`);
     } finally {
         // 恢复按钮状态
         deleteNoteBtn.disabled = false;
         deleteNoteBtn.innerHTML = '<i class="bi bi-trash"></i> 删除笔记';
     }
     */
}


// --- 搜索功能 ---
// 注意：此功能现在由Vue的searchNotes方法接管
async function searchNotes() {
    console.log('注意: 搜索功能已由Vue接管');
    // 通过Vue执行搜索
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.searchNotes) {
            vueApp.searchNotes();
            return;
        }
    }
    
    // 以下代码已由Vue接管
    /*
    const query = searchInput.value.trim();
    if (!query) {
        alert('请输入搜索查询');
        return;
    }

    console.log(`Searching for: ${query}`);
    searchResultsList.innerHTML = '<li class="search-result-item"><em>搜索中...</em> <div class="spinner-border spinner-border-sm text-primary" role="status"></div></li>';
    
    // 禁用搜索按钮
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 搜索中...';

    try {
        // 使用 URLSearchParams 来构建查询参数
        const params = new URLSearchParams({
            q: query,
            limit: 10, // 或者您想要的其他限制
            threshold: 0.2 // 较低的阈值以便看到更多结果
        });
        const response = await fetch(`${API_BASE_URL}/search/?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const results = await response.json();
        console.log('Search results:', results);

        searchResultsList.innerHTML = ''; // 清空
        if (results.length === 0) {
            searchResultsList.innerHTML = '<li class="search-result-item"><em>未找到相关笔记</em></li>';
            return;
        }

        results.forEach(note => {
            const li = document.createElement('li');
            li.className = 'search-result-item';
            // 显示标题和相似度
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <strong>${note.metadata?.title || '无标题'}</strong>
                    <span class="badge bg-info">相似度: ${note.similarity.toFixed(3)}</span>
                </div>
                <p class="mb-0 text-truncate">${note.metadata?.description?.substring(0, 80) || '无描述'}...</p>
            `;
            // 点击搜索结果可以加载到编辑表单
            li.addEventListener('click', () => {
                populateEditForm(note.id, note.metadata?.title || '', note.metadata?.description || '');
            });
            searchResultsList.appendChild(li);
        });

    } catch (error) {
        console.error('搜索失败:', error);
        searchResultsList.innerHTML = '<li class="search-result-item text-danger"><em>搜索失败</em></li>';
    } finally {
        // 恢复搜索按钮
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="bi bi-search"></i> 搜索';
    }
    */
}

// --- 问答功能 ---
// 注意：此功能现在由Vue的askQuestion方法接管
async function askQuestion() {
    console.log('注意: 问答功能已由Vue接管');
    // 通过Vue执行问答
    if (window.app && app._instance) {
        const vueApp = app._instance.proxy;
        if (vueApp && vueApp.askQuestion) {
            vueApp.askQuestion();
            return;
        }
    }
    
    // 以下代码已由Vue接管
    /*
    const question = askInput.value.trim();
    if (!question) {
        alert('请输入您的问题');
        return;
    }

    console.log(`Asking question: ${question}`);
    askAnswerDiv.innerHTML = '<div class="d-flex align-items-center"><span class="me-2">思考中...</span><div class="spinner-border text-primary" role="status"></div></div>';
    askSourcesList.innerHTML = '';
    
    // 禁用提问按钮
    askBtn.disabled = true;
    askBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 思考中...';

    try {
        const response = await fetch(`${API_BASE_URL}/ask/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question }),
        });

        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log('Ask result:', result);

        askAnswerDiv.textContent = result.answer;

        if (result.sources && result.sources.length > 0) {
             askSourcesList.innerHTML = ''; // 清空
             result.sources.forEach(source => {
                 const li = document.createElement('li');
                 li.className = 'source-item';
                 li.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${source.metadata?.title || '无标题'}</strong>
                        <span class="badge bg-info">相似度: ${source.similarity.toFixed(3)}</span>
                    </div>
                    <p class="mb-0 text-truncate">${source.metadata?.description?.substring(0, 60) || '无描述'}...</p>
                 `;
                 // 点击来源可以加载到编辑表单
                 li.addEventListener('click', () => {
                     populateEditForm(source.id, source.metadata?.title || '', source.metadata?.description || '');
                 });
                 askSourcesList.appendChild(li);
             });
        } else {
            askSourcesList.innerHTML = '<li class="source-item"><em>无参考来源</em></li>';
        }

    } catch (error) {
        console.error('问答失败:', error);
        askAnswerDiv.textContent = `问答失败: ${error.message}`;
    } finally {
        // 恢复提问按钮
        askBtn.disabled = false;
        askBtn.innerHTML = '<i class="bi bi-send"></i> 提问';
    }
    */
}


// --- 事件监听器 ---

// 页面加载时获取笔记列表
document.addEventListener('DOMContentLoaded', () => {
    // 不再调用fetchAndDisplayNotes，由Vue处理
    // fetchAndDisplayNotes();
    
    // 不再调用clearEditForm，由Vue处理
    // clearEditForm(); 
    
    // 添加一些视觉效果
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
});

// 以下按钮事件监听不再需要，已由Vue的@click指令接管
// saveNoteBtn.addEventListener('click', saveNote);
// deleteNoteBtn.addEventListener('click', () => { ... });
// clearFormBtn.addEventListener('click', clearEditForm);

// 搜索按钮点击事件 - 由Vue的@click接管
// searchBtn.addEventListener('click', searchNotes);
// 支持 Enter 键搜索 - 由Vue的@keyup.enter接管
// searchInput.addEventListener('keypress', function(event) {
//     if (event.key === 'Enter') {
//         searchNotes();
//     }
// });

// 提问按钮点击事件 - 由Vue的@click接管
// askBtn.addEventListener('click', askQuestion);
// 支持 Enter 键提问 - 由Vue的@keyup.enter接管
// askInput.addEventListener('keypress', function(event) {
//     if (event.key === 'Enter') {
//         askQuestion();
//     }
// });

// 添加表单提交支持
noteDescriptionInput.addEventListener('keydown', function(event) {
    // Ctrl+Enter 保存笔记
    if (event.ctrlKey && event.key === 'Enter') {
        // 通过Vue保存笔记
        if (window.app && app._instance) {
            const vueApp = app._instance.proxy;
            if (vueApp && vueApp.saveNote) {
                vueApp.saveNote();
                return;
            }
        }
        
        // 如果Vue不可用，使用原始方法
        saveNote();
    }
}); 