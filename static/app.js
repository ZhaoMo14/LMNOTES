// LMNOTES Vue应用入口文件
const API_BASE_URL = '/api/v1/notes';

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
        hasAsked: false
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
      isDarkTheme: false
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
    
    // 选择笔记
    selectNote(note) {
      this.currentNote = { ...note };
      // 兼容模式：更新原有DOM元素
      document.getElementById('noteId').value = note.id;
      document.getElementById('noteTitle').value = note.title;
      document.getElementById('noteDescription').value = note.description;
      document.getElementById('deleteNoteBtn').style.display = 'inline-block';
      
      // 在移动设备上选择笔记后收起侧边栏
      if (window.innerWidth < 768) {
        this.sidebarExpanded = false;
      }
    },
    
    // 清空表单
    clearForm() {
      this.currentNote = { id: null, title: '', description: '', category: 'default', isNew: true };
      // 兼容模式：更新原有DOM元素
      document.getElementById('noteId').value = '';
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteDescription').value = '';
      document.getElementById('deleteNoteBtn').style.display = 'none';
    },
    
    // 保存笔记
    async saveNote() {
      // 获取输入值
      const title = this.currentNote.title.trim();
      const description = this.currentNote.description.trim();
      
      if (!title) {
        alert('标题不能为空！');
        return;
      }
      
      const id = this.currentNote.id;
      const isUpdating = !!id;
      const url = isUpdating ? `${API_BASE_URL}/${id}` : `${API_BASE_URL}/`;
      const method = isUpdating ? 'PUT' : 'POST';
      
      console.log(`${isUpdating ? '更新' : '创建'}笔记...`);
      this.loading.save = true;
      
      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            description: description
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`);
        }
        
        console.log('笔记保存成功');
        this.clearForm();
        await this.fetchNotes();
        
      } catch (error) {
        console.error('保存笔记失败:', error);
        alert(`保存笔记失败: ${error.message}`);
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
    },
    
    // 向AI提问
    async askQuestion() {
      // 获取问题
      const question = this.qa.question.trim();
      
      if (!question) {
        alert('请输入您的问题');
        return;
      }
      
      console.log(`提问: ${question}`);
      this.loading.ask = true;
      this.qa.hasAsked = true;
      this.qa.answer = '';
      this.qa.sources = [];
      
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
        console.log('问答结果:', result);
        
        this.qa.answer = result.answer;
        this.qa.sources = result.sources || [];
        
      } catch (error) {
        console.error('问答失败:', error);
        this.qa.answer = `问答失败: ${error.message}`;
      } finally {
        this.loading.ask = false;
      }
    },
    
    // 选择问答来源笔记
    selectQASource(source) {
      this.selectNote({
        id: source.id,
        title: source.metadata?.title || '无标题',
        description: source.metadata?.description || ''
      });
      
      // 清除问答结果显示，回到编辑视图
      this.qa.hasAsked = false;
    },
    
    // 监听表单变化 (双向绑定辅助函数)
    updateNoteFromForm() {
      // 从DOM元素获取最新值 (兼容原有代码)
      this.currentNote.title = document.getElementById('noteTitle').value;
      this.currentNote.description = document.getElementById('noteDescription').value;
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
    }
  },
  // 页面加载时获取笔记列表
  mounted() {
    console.log('Vue应用已挂载，正在加载笔记...');
    this.fetchNotes();
    this.loadThemePreference();
    
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