// API 基础 URL (根据需要调整)
const API_BASE_URL = '/api/v1/notes';

// DOM 元素引用 (后面会添加更多)
const notesList = document.getElementById('notesList');
const noteIdInput = document.getElementById('noteId');
const noteTitleInput = document.getElementById('noteTitle');
const noteDescriptionInput = document.getElementById('noteDescription');
const saveNoteBtn = document.getElementById('saveNoteBtn');
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
async function fetchAndDisplayNotes() {
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
            notesList.innerHTML = '<li>没有笔记</li>';
            return;
        }

        notes.forEach(note => {
            const li = document.createElement('li');
            // 使用 note.id 而不是 note._id
            li.textContent = `${note.title} (ID: ${note.id})`; 
            li.dataset.noteId = note.id; // 将 ID 存储在 data 属性中
            li.dataset.title = note.title;
            li.dataset.description = note.description;

            // 添加点击事件监听器，用于加载笔记到编辑表单
            li.addEventListener('click', () => {
                // 使用 note.id 而不是 note._id
                populateEditForm(note.id, note.title, note.description);
            });

            notesList.appendChild(li);
        });
    } catch (error) {
        console.error('获取笔记失败:', error);
        notesList.innerHTML = '<li>加载笔记失败</li>';
    }
}

// --- 创建/编辑笔记功能 ---

// 将笔记信息填充到编辑表单
function populateEditForm(id, title, description) {
    noteIdInput.value = id;
    noteTitleInput.value = title;
    noteDescriptionInput.value = description;
}

// 清空编辑表单
function clearEditForm() {
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteDescriptionInput.value = '';
}

// 保存笔记（创建或更新）
async function saveNote() {
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
        await fetchAndDisplayNotes(); // 刷新列表

    } catch (error) {
        console.error('保存笔记失败:', error);
        alert(`保存笔记失败: ${error.message}`);
    }
}

// --- 删除笔记功能 ---
// (稍后可以在 populateEditForm 的地方添加删除按钮及其事件)
async function deleteNoteById(id) {
     if (!id) {
         alert('没有选择要删除的笔记');
         return;
     }
     if (!confirm(`确定要删除笔记 ${id} 吗？`)) {
         return;
     }

     console.log(`Deleting note ${id}...`);

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
         await fetchAndDisplayNotes(); // 刷新列表

     } catch (error) {
         console.error('删除笔记失败:', error);
         alert(`删除笔记失败: ${error.message}`);
     }
}


// --- 搜索功能 ---
async function searchNotes() {
    const query = searchInput.value.trim();
    if (!query) {
        alert('请输入搜索查询');
        return;
    }

    console.log(`Searching for: ${query}`);
    searchResultsList.innerHTML = '<li>搜索中...</li>';

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
            searchResultsList.innerHTML = '<li>未找到相关笔记</li>';
            return;
        }

        results.forEach(note => {
            const li = document.createElement('li');
            // 显示标题和相似度
            li.textContent = `${note.metadata?.title || '无标题'} (相似度: ${note.similarity.toFixed(3)})`;
            // 点击搜索结果可以加载到编辑表单
             li.addEventListener('click', () => {
                 populateEditForm(note.id, note.metadata?.title || '', note.metadata?.description || '');
             });
            searchResultsList.appendChild(li);
        });

    } catch (error) {
        console.error('搜索失败:', error);
        searchResultsList.innerHTML = '<li>搜索失败</li>';
    }
}

// --- 问答功能 ---
async function askQuestion() {
    const question = askInput.value.trim();
    if (!question) {
        alert('请输入您的问题');
        return;
    }

    console.log(`Asking question: ${question}`);
    askAnswerDiv.textContent = '思考中...';
    askSourcesList.innerHTML = '';

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
             result.sources.forEach(source => {
                 const li = document.createElement('li');
                 li.textContent = `${source.metadata?.title || '无标题'} (相似度: ${source.similarity.toFixed(3)})`;
                 // 点击来源可以加载到编辑表单
                 li.addEventListener('click', () => {
                     populateEditForm(source.id, source.metadata?.title || '', source.metadata?.description || '');
                 });
                 askSourcesList.appendChild(li);
             });
        } else {
            askSourcesList.innerHTML = '<li>无参考来源</li>';
        }

    } catch (error) {
        console.error('问答失败:', error);
        askAnswerDiv.textContent = `问答失败: ${error.message}`;
    }
}


// --- 事件监听器 ---

// 页面加载时获取笔记列表
document.addEventListener('DOMContentLoaded', fetchAndDisplayNotes);

// 保存按钮点击事件
saveNoteBtn.addEventListener('click', saveNote);

// 清空表单按钮点击事件
clearFormBtn.addEventListener('click', clearEditForm);

// 搜索按钮点击事件
searchBtn.addEventListener('click', searchNotes);
// 支持 Enter 键搜索
searchInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchNotes();
    }
});

// 提问按钮点击事件
askBtn.addEventListener('click', askQuestion);
// 支持 Enter 键提问
askInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        askQuestion();
    }
}); 