/**
 * course-video 视频播放 + 弹幕组件
 * 纯前端实现，不依赖后端接口
 */
Component({
  options: {
    // 样式完全隔离，组件内外互不影响
    styleIsolation: 'isolated',
  },

  properties: {
    /** 可选：组件标题，预留扩展 */
    title: {
      type: String,
      value: '课程视频',
    },
  },

  data: {
    // 视频源（写死为网络测试地址）
    videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',

    // 弹幕输入框内容
    danmuInput: '',

    // 原生 video 弹幕列表（供 danmu-list 属性使用）
    danmuList: [],

    // 实时浮层弹幕列表（cover-view 动画渲染）
    activeDanmus: [],

    // 当前视频播放时间（秒）
    currentTime: 0,

    // 弹幕颜色池（浅色系，在深色视频上可见）
    colors: [
      '#ffffff',
      '#ff6b6b',
      '#ffd93d',
      '#6bcb77',
      '#4d96ff',
      '#ff922b',
      '#ff6eb4',
      '#00e5ff',
    ],

    // 弹幕数量上限
    maxDanmu: 200,
  },

  methods: {
    /**
     * 输入框内容变化
     */
    onInput(e) {
      this.setData({ danmuInput: e.detail.value });
    },

    /**
     * 视频播放时间更新
     */
    onTimeUpdate(e) {
      this.setData({ currentTime: e.detail.currentTime });
    },

    /**
     * 发送弹幕
     * 同时写入原生 danmuList（用于回看时的时间轴弹幕）和 activeDanmus（用于实时飘屏）
     */
    sendDanmu() {
      const text = (this.data.danmuInput || '').trim();
      if (!text) return;

      const color = this.data.colors[
        Math.floor(Math.random() * this.data.colors.length)
      ];
      const id = Date.now() + Math.random();

      // ---- 1. 写入原生弹幕列表（按时间轴排列） ----
      const danmuList = [...this.data.danmuList];
      danmuList.push({
        text,
        color,
        time: this.data.currentTime,
      });
      if (danmuList.length > this.data.maxDanmu) {
        danmuList.splice(0, danmuList.length - this.data.maxDanmu);
      }

      // ---- 2. 创建实时飘屏动画 ----
      const top = Math.floor(Math.random() * 70) + 5; // 5% ~ 75%
      const animation = wx.createAnimation({
        duration: 4500,
        timingFunction: 'linear',
      });
      animation.translateX('-200%').step();

      const activeDanmus = [...this.data.activeDanmus, {
        id,
        text,
        color,
        top,
        animationData: animation.export(),
      }];

      // 限制实时弹幕数量，移除最早的
      while (activeDanmus.length > 15) {
        activeDanmus.shift();
      }

      this.setData({
        danmuList,
        activeDanmus,
        danmuInput: '',
      });

      // ---- 3. 动画结束后自动清除 ----
      setTimeout(() => {
        const filtered = this.data.activeDanmus.filter(
          (item) => item.id !== id,
        );
        this.setData({ activeDanmus: filtered });
      }, 4800);
    },
  },
});
