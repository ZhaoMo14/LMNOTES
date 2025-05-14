// 基于大语言模型的智能在线笔记管理系统 Vue应用入口文件
const API_BASE_URL = '/api/v1/notes';

// 配置Marked.js，用于Markdown解析
marked.setOptions({
  gfm: true, // 启用GitHub风格的Markdown
  breaks: true, // 将回车转换为<br>
  highlight: function(code, lang) {
    // 如果有语言标识且Prism支持该语言，则使用Prism进行代码高亮
    if (lang && Prism.languages[lang]) {
      return Prism.highlight(code, Prism.languages[lang], lang);
    }
    return code; // 否则原样返回
  }
});

const app = Vue.createApp({
  data() {
    return {
      // 当前载入的笔记列表
      notes: [],
      // 当前选中的笔记
      currentNote: {
        id: null,
        title: '',
        description: '',
        category: 'default',
        isNew: true
      },
      // 全局视图状态控制
      view: {
        current: 'editor', // 可能的值: 'editor', 'search', 'qa'
      },
      // 搜索功能
      search: {
        query: '',
        results: [],
        hasSearched: false,
        noResults: false
      },
      // 问答功能
      qa: {
        question: '',
        answer: '',
        sources: [],
        hasAsked: false,
        sessionId: null,  // 会话ID，用于追问功能
        isFollowUp: false,  // 是否是追问
        messageHistory: [],  // 消息历史记录数组
        showHistory: false,  // 是否显示历史记录 - 此字段保留但不再使用，默认总是显示历史
        showSources: true,    // 是否显示参考来源，默认显示
        showReturnToQA: false, // 是否显示返回问答按钮
        previousState: null   // 用于保存问答状态以便返回
      },
      // 导入功能
      importData: {
        loading: false,
        file: null,
        content: '',
        title: '',
        preview: false,
        error: null
      },
      importModal: null,
      // 加载状态
      loading: {
        notes: false,
        save: false,
        delete: false,
        ask: false,
        search: false
      },
      // 界面状态
      sidebarCollapsed: false,
      sidebarExpanded: false,
      // 主题设置
      isDarkTheme: false,
      // 编辑器设置
      editor: {
        previewMode: false, // 默认为编辑模式
        realtimePreview: true, // 默认开启实时预览
        lastSavedContent: '', // 上次保存的内容
        isDirty: false // 是否有未保存的修改
      },
      _skipViewSwitch: false // 用于控制视图切换
    };
  },
  methods: {
    // 获取所有笔记
    async fetchNotes() {
      this.loading.notes = true;
      try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.notes = await response.json();
        // 翻转数组，使最新的笔记显示在顶部
        this.notes.reverse();
        console.log('Notes loaded successfully:', this.notes);
      } catch (error) {
        console.error('获取笔记失败:', error);
      } finally {
        this.loading.notes = false;
      }
    },
    
    // 切换主题
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      
      // 更新 data-theme 属性
      if (this.isDarkTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      
      // 保存用户偏好
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    },
    
    // 从本地存储加载主题
    loadThemePreference() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        this.isDarkTheme = true;
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        // 检查系统主题偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.isDarkTheme = true;
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }
    },
    
    // 切换侧边栏状态（仅移动设备）
    toggleSidebar() {
      this.sidebarExpanded = !this.sidebarExpanded;
    },
    
    // 选择某个笔记
    selectNote(note) {
      console.log('选择笔记:', note.id);
      
      // 防止无效数据
      if (!note || !note.id) {
        console.error('无效的笔记数据');
        return;
      }
      
      // 更新当前笔记
      this.currentNote = { 
        id: note.id, 
        title: note.title || '', 
        description: note.description || '',
        isNew: false
      };
      
      // 更新上次保存的内容（用于脏状态检测）
      this.editor.lastSavedContent = this.currentNote.description;
      this.editor.isDirty = false;
      
      // 切换到编辑器视图（除非标记跳过视图切换）
      if (!this._skipViewSwitch) {
        this.view.current = 'editor';
        
        // 如果之前正在问答，则清除返回状态
        if (this.qa.showReturnToQA) {
          this.qa.showReturnToQA = false;
          this.qa.previousState = null;
        }
      }
      
      // 搜索后选择笔记时，清除搜索状态
      this.search.hasSearched = false;
      
      // 在移动设备上选择笔记后收起侧边栏
      if (window.innerWidth < 768) {
        this.sidebarExpanded = false;
      }
    },
    
    // 清空表单(创建新笔记)
    clearForm() {
      this.currentNote = {
        id: null,
        title: '',
        description: '',
        isNew: true
      };
      
      // 重置视图状态
      this.view.current = 'editor';
      
      // 重置编辑器脏状态
      this.editor.isDirty = false;
      this.editor.lastSavedContent = '';
      
      // 清除返回问答状态
      this.qa.showReturnToQA = false;
      this.qa.previousState = null;
      
      // 清除之前选中的笔记
      document.querySelectorAll('.note-item.active').forEach(el => {
        el.classList.remove('active');
      });
    },
    
    // 保存笔记
    async saveNote() {
      // 防止重复提交
      if (this.loading.save) return;
      
      // 验证标题不能为空
      if (!this.currentNote.title.trim()) {
        alert('笔记标题不能为空');
        return;
      }
      
      // 标记为加载中
      this.loading.save = true;
      
      try {
        const method = this.currentNote.id ? 'PUT' : 'POST';
        const url = this.currentNote.id 
          ? `${API_BASE_URL}/${this.currentNote.id}` 
          : `${API_BASE_URL}/`;
        
        console.log(`保存笔记 - ${method}:`, this.currentNote);
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: this.currentNote.title,
            description: this.currentNote.description
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 解析响应并更新ID（对于新笔记）
        const data = await response.json();
        if (!this.currentNote.id && data.id) {
          this.currentNote.id = data.id;
        }
        
        // 更新最后保存的内容状态
        this.editor.lastSavedContent = this.currentNote.description;
        this.editor.isDirty = false;
        
        console.log('笔记保存成功:', data);
        
        // 刷新笔记列表
        await this.fetchNotes();
        
      } catch (error) {
        console.error('保存笔记失败:', error);
        alert(`保存失败: ${error.message}`);
      } finally {
        this.loading.save = false;
      }
    },
    
    // 删除笔记
    async deleteNote() {
      const id = this.currentNote.id;
      
      if (!id) {
        alert('没有选择要删除的笔记');
        return;
      }
      
      if (!confirm(`确定要删除笔记 ${id} 吗？`)) {
        return;
      }
      
      console.log(`删除笔记 ${id}...`);
      this.loading.delete = true;
      
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
          method: 'DELETE',
        });
        
        // 204 No Content 也算 ok
        if (!response.ok && response.status !== 204) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Note not found'}`);
        }
        
        console.log('笔记删除成功');
        this.clearForm();
        await this.fetchNotes();
        
      } catch (error) {
        console.error('删除笔记失败:', error);
        alert(`删除笔记失败: ${error.message}`);
      } finally {
        this.loading.delete = false;
      }
    },
    
    // 搜索笔记
    async searchNotes() {
      // 获取搜索查询
      const query = this.search.query.trim();
      
      if (!query) {
        alert('请输入搜索查询');
        return;
      }
      
      console.log(`搜索: ${query}`);
      this.loading.search = true;
      this.search.hasSearched = true;
      this.search.results = [];
      
      // 设置当前视图为搜索视图
      this.view.current = 'search';
      
      try {
        // 使用 URLSearchParams 构建查询参数
        const params = new URLSearchParams({
          q: query,
          limit: 10,
          threshold: 0.2
        });
        
        const response = await fetch(`${API_BASE_URL}/search/?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        this.search.results = await response.json();
        console.log('搜索结果:', this.search.results);
        
      } catch (error) {
        console.error('搜索失败:', error);
        alert(`搜索失败: ${error.message}`);
      } finally {
        this.loading.search = false;
      }
    },
    
    // 选择搜索结果
    selectSearchResult(result) {
      this.selectNote({
        id: result.id,
        title: result.metadata?.title || '无标题',
        description: result.metadata?.description || ''
      });
      
      // 清除搜索结果显示，回到编辑视图
      this.search.hasSearched = false;
      this.view.current = 'editor';
    },
    
    // 向AI提问
    async askQuestion() {
      // 获取问题
      const question = this.qa.question.trim();
      
      if (!question) {
        alert('请输入您的问题');
        return;
      }
      
      console.log(`提问: ${question}${this.qa.sessionId ? ' (追问)' : ''}`);
      this.loading.ask = true;
      this.qa.hasAsked = true;
      
      // 设置当前视图为问答视图
      this.view.current = 'qa';
      
      // 保存之前的答案，以便在API调用失败时恢复
      const previousAnswer = this.qa.answer;
      const previousSources = [...this.qa.sources];
      const previousHistory = [...this.qa.messageHistory];
      
      // 先添加用户问题到本地消息历史（为了即时显示）
      if (!this.qa.messageHistory.some(msg => msg.role === 'user' && msg.content === question)) {
        this.qa.messageHistory.push({
          role: 'user',
          content: question,
          timestamp: new Date().getTime()
        });
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/ask/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            question: question,
            session_id: this.qa.sessionId // 发送会话ID（如果有）
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`);
        }
        
        const result = await response.json();
        console.log('问答结果:', result);
        
        this.qa.answer = result.answer;
        this.qa.sources = result.sources || [];
        
        // 保存会话ID以支持追问
        if (result.session_id) {
          this.qa.sessionId = result.session_id;
          this.qa.isFollowUp = true;
          console.log(`会话ID: ${this.qa.sessionId}`);
          
          // 如果后端返回了消息历史，则使用后端返回的完整历史
          if (result.message_history && result.message_history.length > 0) {
            // 将后端返回的消息历史转换为前端格式（添加timestamp）
            this.qa.messageHistory = result.message_history.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || new Date().getTime()
            }));
            console.log(`接收到 ${this.qa.messageHistory.length} 条历史消息`);
          } else {
            // 后端没有返回消息历史，添加当前问答到历史记录（确保不重复添加）
            if (!this.qa.messageHistory.some(msg => msg.role === 'assistant' && msg.content === result.answer)) {
              this.qa.messageHistory.push(
                { role: 'assistant', content: result.answer, timestamp: new Date().getTime() }
              );
            }
          }
        }
        
        // 清空输入框，方便继续提问
        this.qa.question = '';
        
        // 延迟执行代码高亮
        this.$nextTick(() => {
          // 高亮所有代码块
          document.querySelectorAll('pre code').forEach((block) => {
            if (window.Prism) {
              Prism.highlightElement(block);
            }
          });
          
          // 滚动到底部
          const contentArea = document.querySelector('.content-area');
          if (contentArea) {
            contentArea.scrollTop = contentArea.scrollHeight;
          }
        });
        
      } catch (error) {
        console.error('问答失败:', error);
        
        // 恢复之前的答案、来源和历史记录
        this.qa.messageHistory = previousHistory;
        this.qa.answer = previousAnswer;
        this.qa.sources = previousSources;
        
        // 添加错误消息到历史，使用代码块格式展示错误
        this.qa.messageHistory.push({
          role: 'assistant',
          content: `**问答失败**\n\n\`\`\`\n${error.message}\n\`\`\``,
          timestamp: new Date().getTime(),
          isError: true
        });
      } finally {
        this.loading.ask = false;
      }
    },
    
    // 开始新问题（清除当前会话）
    startNewQuestion() {
      this.qa.sessionId = null;
      this.qa.isFollowUp = false;
      this.qa.hasAsked = false;
      this.qa.question = '';
      this.qa.answer = '';
      this.qa.sources = [];
      this.qa.messageHistory = [];
      this.qa.showHistory = false;
      this.qa.showSources = true;
      this.qa.showReturnToQA = false;
      this.qa.previousState = null;
      
      // 重置视图状态为编辑器
      this.view.current = 'editor';
      
      console.log('开始新问题，会话已重置');
    },
    
    // 选择问答来源笔记
    selectQASource(source) {
      // 标记是否来自问答视图的点击
      const fromQAView = this.view.current === 'qa';
      console.log('选择参考来源:', source.id, '来自问答视图:', fromQAView);
      
      try {
        // 临时保存当前对话状态
        const previousQAState = {
          hasAsked: this.qa.hasAsked,
          answer: this.qa.answer,
          sources: [...this.qa.sources],
          messageHistory: [...this.qa.messageHistory],
          sessionId: this.qa.sessionId,
          isFollowUp: this.qa.isFollowUp
        };
        
        // 设置视图标记，阻止selectNote方法中的自动视图切换
        this._skipViewSwitch = true;
        
        // 选择笔记
        this.selectNote({
          id: source.id,
          title: source.metadata?.title || '无标题',
          description: source.metadata?.description || ''
        });
        
        // 如果是从问答视图点击的参考来源，设置一个按钮返回问答
        if (fromQAView) {
          // 显示返回问答的提示
          this.qa.showReturnToQA = true;
          
          // 保存问答状态以便返回
          this.qa.previousState = previousQAState;
        }
        
        // 手动设置视图为编辑器视图
        this.$nextTick(() => {
          this.view.current = 'editor';
          console.log('已切换到编辑器视图');
        });
      } catch (error) {
        console.error('选择参考来源失败:', error);
      } finally {
        // 清除视图切换标记 - 延迟执行以确保视图已更新
        setTimeout(() => {
          this._skipViewSwitch = false;
        }, 100);
      }
    },
    
    // 监听表单变化 (双向绑定辅助函数)
    updateNoteFromForm() {
      // 从DOM元素获取最新值 (兼容原有代码)
      this.currentNote.title = document.getElementById('noteTitle').value;
      this.currentNote.description = document.getElementById('noteDescription').value;
      
      // 检查是否有未保存的修改
      this.checkDirtyState();
    },
    
    // 检查编辑器内容是否有未保存的修改
    checkDirtyState() {
      if (this.currentNote.id) {
        // 对于已有笔记，比较当前内容和上次保存的内容
        this.editor.isDirty = this.currentNote.description !== this.editor.lastSavedContent;
      } else {
        // 对于新笔记，如果有内容则标记为未保存
        this.editor.isDirty = this.currentNote.title.trim() !== '' || 
                             this.currentNote.description.trim() !== '';
      }
    },
    
    // 格式化ID (只显示前几个字符)
    formatId(id) {
      return id.substring(0, 6) + '...';
    },
    
    // 格式化日期
    formatDate(dateString) {
      const date = new Date(dateString);
      
      // 如果日期无效，返回空字符串
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diff = now - date; // 毫秒差
      
      // 一分钟内
      if (diff < 60 * 1000) {
        return '刚刚';
      }
      
      // 一小时内
      if (diff < 60 * 60 * 1000) {
        return Math.floor(diff / (60 * 1000)) + '分钟前';
      }
      
      // 一天内
      if (diff < 24 * 60 * 60 * 1000) {
        return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
      }
      
      // 一周内
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
      }
      
      // 其他情况显示完整日期
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    },
    
    // 获取文本字数
    getWordCount(text) {
      if (!text) return 0;
      // 简单字数统计(中英文混合)
      const words = text.trim().replace(/\s+/g, ' ').split(' ');
      let count = 0;
      
      for (const word of words) {
        const chineseCount = (word.match(/[\u4e00-\u9fa5]/g) || []).length;
        const nonChineseCount = word.length - chineseCount;
        count += chineseCount + (nonChineseCount > 0 ? 1 : 0);
      }
      
      return count;
    },
    
    // 格式化相似度分数
    formatSimilarity(similarity) {
      if (typeof similarity !== 'number') return '0.000';
      return similarity.toFixed(3);
    },

    // 响应式查询 - 检测移动设备
    isMobileDevice() {
      return window.innerWidth < 768;
    },

    // 显示导入模态框
    showImportModal() {
      // 初始化Bootstrap模态框
      if (!this.importModal) {
        this.importModal = new bootstrap.Modal(document.getElementById('importModal'));
      }
      
      // 重置导入数据
      this.resetImportData();
      
      // 显示模态框
      this.importModal.show();
    },
    
    // 重置导入数据
    resetImportData() {
      this.importData = {
        loading: false,
        file: null,
        content: '',
        title: '',
        preview: false,
        error: null
      };
    },
    
    // 处理文件选择
    handleFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.importData.loading = true;
      this.importData.file = file;
      this.importData.error = null;
      
      const fileName = file.name;
      // 从文件名中提取标题（去除扩展名）
      const fileTitle = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      this.importData.title = fileTitle;
      
      const fileExt = fileName.split('.').pop().toLowerCase();
      
      if (fileExt === 'md') {
        this.parseMarkdownFile(file);
      } else if (fileExt === 'pdf') {
        this.parsePDFFile(file);
      } else {
        this.importData.loading = false;
        this.importData.error = '不支持的文件格式。请上传Markdown或PDF文件。';
      }
    },
    
    // 解析Markdown文件
    parseMarkdownFile(file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          this.importData.content = content;
          this.importData.preview = true;
          this.importData.loading = false;
        } catch (error) {
          console.error('解析Markdown文件出错:', error);
          this.importData.loading = false;
          this.importData.error = '解析文件时出错: ' + error.message;
        }
      };
      
      reader.onerror = (error) => {
        console.error('读取文件出错:', error);
        this.importData.loading = false;
        this.importData.error = '读取文件时出错';
      };
      
      reader.readAsText(file);
    },
    
    // 解析PDF文件
    parsePDFFile(file) {
      // 检查是否已加载PDF.js库
      if (typeof pdfjsLib === 'undefined') {
        // 动态加载PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
        script.onload = () => {
          // PDF.js加载完成后初始化并解析PDF
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
          this.extractPDFContent(file);
        };
        script.onerror = () => {
          this.importData.loading = false;
          this.importData.error = '加载PDF解析库失败，请稍后再试';
        };
        document.head.appendChild(script);
      } else {
        // PDF.js已加载，直接解析
        this.extractPDFContent(file);
      }
    },
    
    // 提取PDF内容
    extractPDFContent(file) {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          
          const pdf = await loadingTask.promise;
          let textContent = '';
          
          // 提取每一页的文本
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            textContent += strings.join(' ') + '\n';
          }
          
          this.importData.content = textContent;
          this.importData.preview = true;
          this.importData.loading = false;
        } catch (error) {
          console.error('解析PDF文件出错:', error);
          this.importData.loading = false;
          this.importData.error = '解析PDF文件时出错: ' + error.message;
        }
      };
      
      reader.onerror = (error) => {
        console.error('读取文件出错:', error);
        this.importData.loading = false;
        this.importData.error = '读取文件时出错';
      };
      
      reader.readAsArrayBuffer(file);
    },
    
    // 导入为笔记
    async importAsNote() {
      if (!this.importData.title.trim() || !this.importData.content) {
        this.importData.error = '标题和内容不能为空';
        return;
      }
      
      this.importData.loading = true;
      
      try {
        const response = await fetch(`${API_BASE_URL}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: this.importData.title.trim(),
            description: this.importData.content
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('笔记创建成功:', result);
        
        // 关闭模态框
        this.importModal.hide();
        
        // 重新加载笔记列表
        this.fetchNotes();
        
        // 显示成功提示
        alert('文件成功导入为笔记!');
      } catch (error) {
        console.error('导入笔记出错:', error);
        this.importData.error = '导入笔记时出错: ' + error.message;
        this.importData.loading = false;
      }
    },
    
    // 切换历史记录显示状态
    toggleHistoryView() {
      this.qa.showHistory = !this.qa.showHistory;
    },
    
    // 格式化时间戳
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    // 解析Markdown文本为HTML
    parseMarkdown(text) {
      if (!text) return '';
      
      try {
        // 防止频繁更新导致性能问题
        // 如果快速输入时暂时不渲染代码高亮
        const html = marked.parse(text);
        
        // 如果在实时预览模式下，只在内容较少或停止输入后执行代码高亮
        if (this.editor.realtimePreview) {
          // 如果内容少于1000字符，立即执行高亮
          if (text.length < 1000) {
            this.$nextTick(() => {
              document.querySelectorAll('.preview-container pre code').forEach((block) => {
                if (window.Prism) {
                  Prism.highlightElement(block);
                }
              });
            });
          } else {
            // 内容较多时，使用防抖延迟执行高亮
            clearTimeout(this._parseMarkdownTimer);
            this._parseMarkdownTimer = setTimeout(() => {
              document.querySelectorAll('.preview-container pre code').forEach((block) => {
                if (window.Prism) {
                  Prism.highlightElement(block);
                }
              });
            }, 500);
          }
        } else {
          // 非实时预览模式下，正常执行高亮
          this.$nextTick(() => {
            document.querySelectorAll('pre code').forEach((block) => {
              if (window.Prism) {
                Prism.highlightElement(block);
              }
            });
          });
        }
        
        return html;
      } catch (error) {
        console.error('Markdown解析错误:', error);
        return text; // 解析失败时返回原文本
      }
    },
    
    // 移除Markdown格式符号，用于纯文本显示
    stripMarkdown(text) {
      if (!text) return '';
      
      return text
        // 移除标题符号
        .replace(/#{1,6}\s+/g, '')
        // 移除粗体和斜体
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        // 移除代码块
        .replace(/```[\s\S]*?```/g, '[代码块]')
        // 移除行内代码
        .replace(/`([^`]+)`/g, '$1')
        // 移除链接，保留文本
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 移除图片
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片:$1]')
        // 移除引用符号
        .replace(/^\s*>\s+/gm, '')
        // 移除HTML标签
        .replace(/<[^>]*>/g, '')
        // 移除列表符号
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // 移除水平线
        .replace(/^\s*[-*_]{3,}\s*$/gm, '');
    },
    
    // 在文本区域插入Markdown格式
    insertMarkdown(type) {
      const textarea = document.getElementById('noteDescription');
      if (!textarea) return;
      
      // 保存当前的选择位置
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = this.currentNote.description.substring(start, end);
      
      let insertedText = '';
      
      switch (type) {
        case 'heading':
          insertedText = `## ${selectedText || '标题'}`;
          break;
        case 'bold':
          insertedText = `**${selectedText || '粗体文本'}**`;
          break;
        case 'italic':
          insertedText = `*${selectedText || '斜体文本'}*`;
          break;
        case 'link':
          insertedText = `[${selectedText || '链接文本'}](http://example.com)`;
          break;
        case 'code':
          if (selectedText.includes('\n')) {
            // 多行代码块
            insertedText = `\`\`\`\n${selectedText || '// 代码块'}\n\`\`\``;
          } else {
            // 行内代码
            insertedText = `\`${selectedText || '代码'}\``;
          }
          break;
        case 'list':
          if (selectedText) {
            // 将选中文本转换为列表
            insertedText = selectedText
              .split('\n')
              .map(line => line ? `- ${line}` : line)
              .join('\n');
          } else {
            insertedText = "- 列表项1\n- 列表项2\n- 列表项3";
          }
          break;
        case 'ordered-list':
          if (selectedText) {
            // 将选中文本转换为有序列表
            insertedText = selectedText
              .split('\n')
              .map((line, i) => line ? `${i + 1}. ${line}` : line)
              .join('\n');
          } else {
            insertedText = "1. 第一项\n2. 第二项\n3. 第三项";
          }
          break;
        case 'quote':
          if (selectedText) {
            // 将选中文本转换为引用
            insertedText = selectedText
              .split('\n')
              .map(line => line ? `> ${line}` : line)
              .join('\n');
          } else {
            insertedText = "> 引用内容";
          }
          break;
        case 'table':
          insertedText = `| 表头1 | 表头2 | 表头3 |\n|-------|-------|-------|\n| 内容1 | 内容2 | 内容3 |\n| 内容4 | 内容5 | 内容6 |`;
          break;
        case 'image':
          insertedText = `![${selectedText || '图片描述'}](https://example.com/image.jpg)`;
          break;
        default:
          return;
      }
      
      // 插入新内容
      const newText = this.currentNote.description.substring(0, start) + 
                     insertedText + 
                     this.currentNote.description.substring(end);
      
      // 更新文本区域内容
      this.currentNote.description = newText;
      
      // 聚焦文本区域并设置光标位置
      this.$nextTick(() => {
        textarea.focus();
        const newCursorPos = start + insertedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    
    // 加载用户界面偏好设置
    loadUserPreferences() {
      // 加载主题偏好
      this.loadThemePreference();
      
      // 加载编辑器偏好
      const realtimePreview = localStorage.getItem('realtimePreview');
      if (realtimePreview !== null) {
        this.editor.realtimePreview = realtimePreview === 'true';
      }
    },
    
    // 保存用户界面偏好设置
    saveUserPreferences() {
      // 保存编辑器偏好
      localStorage.setItem('realtimePreview', this.editor.realtimePreview);
    },

    // 返回问答视图
    returnToQA() {
      if (!this.qa.previousState) {
        console.error('没有保存的问答状态可以返回');
        return;
      }
      
      // 恢复问答状态
      this.qa.hasAsked = this.qa.previousState.hasAsked;
      this.qa.answer = this.qa.previousState.answer;
      this.qa.sources = this.qa.previousState.sources;
      this.qa.messageHistory = this.qa.previousState.messageHistory;
      this.qa.sessionId = this.qa.previousState.sessionId;
      this.qa.isFollowUp = this.qa.previousState.isFollowUp;
      
      // 切换到问答视图
      this.view.current = 'qa';
      
      // 隐藏返回按钮
      this.qa.showReturnToQA = false;
      this.qa.previousState = null;
      
      console.log('已返回问答视图');
    }
  },
  // 页面加载时获取笔记列表
  mounted() {
    console.log('Vue应用已挂载，正在加载笔记...');
    this.fetchNotes();
    
    // 加载用户偏好设置
    this.loadUserPreferences();
    
    // 初始化视图状态
    this.view.current = 'editor';
    
    // 为传统表单元素添加事件监听，确保数据同步
    document.getElementById('noteTitle').addEventListener('input', this.updateNoteFromForm);
    document.getElementById('noteDescription').addEventListener('input', this.updateNoteFromForm);
    
    // 检测窗口大小变化
    window.addEventListener('resize', () => {
      // 如果是桌面视图，确保侧边栏展开
      if (window.innerWidth >= 768) {
        this.sidebarExpanded = false; // 桌面视图下不需要expanded类
      }
    });

    // 初始化检测设备类型
    if (this.isMobileDevice()) {
      this.sidebarExpanded = false; // 移动设备默认折叠
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) { // 只在用户未设置偏好时响应
          if (e.matches) {
            this.isDarkTheme = true;
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            this.isDarkTheme = false;
            document.documentElement.removeAttribute('data-theme');
          }
        }
      });
    }
  }
});

// 挂载Vue应用
app.mount('#vue-app'); 