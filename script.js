/* =====================================================
   LiquidPlay - منطق اصلی
   همه چیز با Vanilla JS - بدون کتابخانه
   ===================================================== */

(function () {
  "use strict";

  /* =====================================================
     ۱) ابزارهای کمکی
     ===================================================== */

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const formatTime = (sec) => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return m + ":" + String(s).padStart(2, "0");
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + " " + units[i];
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const isVideoFile = (f) => f && (f.type || "").startsWith("video/") ||
    /\.(mp4|webm|mkv|mov|avi|m4v|ogv|flv)$/i.test(f.name || "");

  const isImageFile = (f) => f && (f.type || "").startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/i.test(f.name || "");

  const saveLS = (key, val) => {
    try { localStorage.setItem("liquidplay." + key, JSON.stringify(val)); } catch (e) {}
  };

  const loadLS = (key, def) => {
    try {
      const raw = localStorage.getItem("liquidplay." + key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) { return def; }
  };

  /* =====================================================
     ۲) توست
     ===================================================== */

  const toastWrap = $("toastWrap");

  function toast(msg, type, duration) {
    if (!toastWrap) return;
    type = type || "info";
    duration = duration || 2600;

    const t = document.createElement("div");
    t.className = "toast toast-" + type;
    t.textContent = msg;
    toastWrap.appendChild(t);

    setTimeout(() => {
      t.classList.add("removing");
      setTimeout(() => t.remove(), 400);
    }, duration);
  }

  /* =====================================================
     ۳) اپلیکیشن اصلی
     ===================================================== */

  const App = {
    /* ---------- state ---------- */
    playlist: [],        // [{ id, file, url, name, size, duration, thumb, type:'video'|'image' }]
    currentIndex: -1,
    gallery: [],         // عکس‌ها
    bookmarks: {},       // { fileId: [{id,time,name}] }
    notes: {},           // { fileId: [{id,time,text}] }
    subtitles: {},       // { fileId: [track] }
    history: [],         // [{ id, name, watchedAt }]
    settings: null,
    abLoop: { a: null, b: null },
    sleepTimer: null,
    sleepEndOfVideo: false,
    isSeeking: false,
    miniMode: false,
    subtitlesEnabled: true,

    /* ---------- DOM refs ---------- */
    dom: {},

    /* =================================================
       init
       ================================================= */
    init() {
      this.cacheDom();
      this.loadSettings();
      this.applySettings();
      this.bindHeader();
      this.bindSidebar();
      this.bindPlayer();
      this.bindTimeline();
      this.bindControls();
      this.bindGallery();
      this.bindUpload();
      this.bindPhotoViewer();
      this.bindSettingsPanel();
      this.bindModals();
      this.bindKeyboard();
      this.bindGestures();
      this.bindContextMenu();
      this.bindContextMenuGlobal();
      this.applyThemeAuto();
      this.hideBigPlay();
      this.showView("upload");
      console.log("LiquidPlay ready");
    },

    /* =================================================
       cacheDom
       ================================================= */
    cacheDom() {
      const ids = [
        "app","appHeader","sidebarToggleBtn","logoHome","appNav",
        "uploadBtn","shortcutsBtn","themeToggle","settingsBtn",
        "playlistSidebar","sidebarTabs","playlistSearch","playlistSort",
        "playlistList","playlistEmpty","addFirstFileBtn","playlistCount","clearPlaylistBtn",
        "mainArea","viewPlayer","viewGallery","viewUpload","videoWrapper",
        "videoPlayer","pauseBlur","bigPlayBtn","videoTopOverlay","videoTitle","videoMeta",
        "miniModeBtn","closeVideoBtn","gestureLeft","gestureRight","gestureIndicator","gestureIcon","gestureValue",
        "controlsBar","timelineWrap","timeline","timelineBuffer","timelineProgress","timelineThumb",
        "timelineAB","timelineBookmarks","timelinePreview","timelinePreviewCanvas","timelinePreviewTime",
        "playPauseBtn","playPauseIcon","prevBtn","rewindBtn","forwardBtn","nextBtn",
        "muteBtn","volumeIcon","volumeSlider","timeDisplay",
        "screenshotBtn","bookmarkBtn","noteBtn","subtitleBtn","loopBtn","abLoopBtn","filtersBtn",
        "speedBtn","speedLabel","speedMenu","rotateBtn","mirrorBtn","pipBtn","sleepTimerBtn","fullscreenBtn","fullscreenIcon",
        "extraStatus","extraSpeed","extraQuality","extraWatched","playerExtra",
        "galleryGrid","galleryEmpty","addFirstPhotoBtn","gallerySlideShowBtn","gallerySort",
        "dropZone","pickVideoBtn","pickImageBtn","pickFolderBtn",
        "photoViewer","photoViewerBackdrop","photoName","photoImg","photoStage",
        "photoPrev","photoNext","photoZoomIn","photoZoomOut","photoRotate","photoReset","photoDownload","photoClose",
        "settingsPanel","settingsClose","settingsOverlay","themeSegment",
        "glassOpacitySlider","glassOpacityValue","blurIntensitySlider","blurIntensityValue",
        "bloomIntensitySlider","bloomIntensityValue","reduceMotionToggle","highContrastToggle",
        "defaultVolumeSlider","defaultVolumeValue","defaultSpeedSelect",
        "autoPlayToggle","autoNextToggle","rememberProgressToggle",
        "subtitleSizeSlider","subtitleSizeValue","subtitleColorInput","subtitleBgToggle",
        "exportSettingsBtn","importSettingsBtn","resetSettingsBtn",
        "shortcutsModal","screenshotModal","screenshotPreview","screenshotDownloadBtn","screenshotCopyBtn",
        "bookmarkModal","bookmarkNameInput","bookmarkTimeLabel","bookmarkSaveBtn",
        "noteModal","noteTextInput","noteTimeLabel","noteSaveBtn",
        "sleepTimerModal","subtitleModal","loadSubtitleBtn","subtitleList","removeSubtitleBtn",
        "filtersModal","filterBrightness","filterBrightnessValue",
        "filterContrast","filterContrastValue","filterSaturate","filterSaturateValue",
        "filterHue","filterHueValue","filterBlur","filterBlurValue","resetFiltersBtn",
        "contextMenu","videoInput","imageInput","folderInput","subtitleInput","importSettingsInput"
      ];
      ids.forEach((id) => { this.dom[id] = $(id); });
    },

    /* =================================================
       تنظیمات
       ================================================= */
    loadSettings() {
      const def = {
        theme: "dark",
        glassOpacity: 70,
        blurIntensity: 10,
        bloomIntensity: 50,
        reduceMotion: false,
        highContrast: false,
        defaultVolume: 1,
        defaultSpeed: 1,
        autoPlay: false,
        autoNext: true,
        rememberProgress: true,
        subtitleSize: 20,
        subtitleColor: "#ffffff",
        subtitleBg: true,
        loop: false
      };
      this.settings = Object.assign({}, def, loadLS("settings", {}));
      this.bookmarks = loadLS("bookmarks", {});
      this.notes = loadLS("notes", {});
      this.history = loadLS("history", []);
    },

    saveSettings() {
      saveLS("settings", this.settings);
    },

    applySettings() {
      const s = this.settings;
      document.documentElement.style.setProperty("--glass-opacity", (s.glassOpacity / 100).toFixed(2));
      document.documentElement.style.setProperty("--blur-amount", s.blurIntensity + "px");
      document.documentElement.style.setProperty("--bloom-strength", (s.bloomIntensity / 100).toFixed(2));

      document.body.classList.toggle("reduce-motion", !!s.reduceMotion);
      document.body.classList.toggle("high-contrast", !!s.highContrast);

      this.setTheme(s.theme);

      // سینک کردن UI
      if (this.dom.glassOpacitySlider) this.dom.glassOpacitySlider.value = s.glassOpacity;
      if (this.dom.glassOpacityValue) this.dom.glassOpacityValue.textContent = s.glassOpacity + "%";
      if (this.dom.blurIntensitySlider) this.dom.blurIntensitySlider.value = s.blurIntensity;
      if (this.dom.blurIntensityValue) this.dom.blurIntensityValue.textContent = s.blurIntensity + "px";
      if (this.dom.bloomIntensitySlider) this.dom.bloomIntensitySlider.value = s.bloomIntensity;
      if (this.dom.bloomIntensityValue) this.dom.bloomIntensityValue.textContent = s.bloomIntensity + "%";
      if (this.dom.reduceMotionToggle) this.dom.reduceMotionToggle.checked = !!s.reduceMotion;
      if (this.dom.highContrastToggle) this.dom.highContrastToggle.checked = !!s.highContrast;
      if (this.dom.defaultVolumeSlider) this.dom.defaultVolumeSlider.value = s.defaultVolume;
      if (this.dom.defaultVolumeValue) this.dom.defaultVolumeValue.textContent = Math.round(s.defaultVolume * 100) + "%";
      if (this.dom.defaultSpeedSelect) this.dom.defaultSpeedSelect.value = String(s.defaultSpeed);
      if (this.dom.autoPlayToggle) this.dom.autoPlayToggle.checked = !!s.autoPlay;
      if (this.dom.autoNextToggle) this.dom.autoNextToggle.checked = !!s.autoNext;
      if (this.dom.rememberProgressToggle) this.dom.rememberProgressToggle.checked = !!s.rememberProgress;
      if (this.dom.subtitleSizeSlider) this.dom.subtitleSizeSlider.value = s.subtitleSize;
      if (this.dom.subtitleSizeValue) this.dom.subtitleSizeValue.textContent = s.subtitleSize;
      if (this.dom.subtitleColorInput) this.dom.subtitleColorInput.value = s.subtitleColor;
      if (this.dom.subtitleBgToggle) this.dom.subtitleBgToggle.checked = !!s.subtitleBg;

      // سگمنت تم
      if (this.dom.themeSegment) {
        $$(".segmented button", this.dom.themeSegment).forEach((b) => {
          b.classList.toggle("active", b.dataset.theme === s.theme);
        });
      }

      // سرعت پخش پیش‌فرض
      if (this.dom.videoPlayer) this.dom.videoPlayer.playbackRate = s.defaultSpeed;
      if (this.dom.speedLabel) this.dom.speedLabel.textContent = s.defaultSpeed + "x";
      if (this.dom.extraSpeed) this.dom.extraSpeed.textContent = s.defaultSpeed + "x";
    },

    setTheme(mode) {
      this.settings.theme = mode;
      let effective = mode;
      if (mode === "auto") {
        const h = new Date().getHours();
        effective = (h >= 7 && h < 19) ? "light" : "dark";
      }
      document.body.setAttribute("data-theme", effective);
      saveLS("settings", this.settings);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", effective === "dark" ? "#0a0a14" : "#eef1f8");
    },

    applyThemeAuto() {
      if (this.settings.theme === "auto") {
        setInterval(() => {
          if (this.settings.theme === "auto") this.setTheme("auto");
        }, 60000);
      }
    },

    /* =================================================
       هدر
       ================================================= */
    bindHeader() {
      on(this.dom.sidebarToggleBtn, "click", () => {
        this.dom.playlistSidebar.classList.toggle("collapsed");
      });

      on(this.dom.logoHome, "click", (e) => {
        e.preventDefault();
        this.showView("upload");
      });

      // نویگیشن
      $$(".nav-btn", this.dom.appNav).forEach((b) => {
        on(b, "click", () => {
          $$(".nav-btn", this.dom.appNav).forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          this.showView(b.dataset.view);
        });
      });

      on(this.dom.uploadBtn, "click", () => this.dom.videoInput.click());

      on(this.dom.shortcutsBtn, "click", () => {
        this.openModal("shortcutsModal");
      });

      on(this.dom.themeToggle, "click", () => {
        const order = ["light", "dark", "auto"];
        const cur = this.settings.theme;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        this.setTheme(next);
        this.applySettings();
        const names = { light: "روشن", dark: "تاریک", auto: "خودکار" };
        toast("تم: " + names[next], "info", 1600);
      });

      on(this.dom.settingsBtn, "click", () => this.openSettings());
    },

    /* =================================================
       سایدبار
       ================================================= */
    bindSidebar() {
      $$(".sidebar-tab", this.dom.sidebarTabs).forEach((t) => {
        on(t, "click", () => {
          $$(".sidebar-tab", this.dom.sidebarTabs).forEach((x) => x.classList.remove("active"));
          t.classList.add("active");
          this.renderSidebarList(t.dataset.tab);
        });
      });

      on(this.dom.playlistSearch, "input", () => {
        const active = document.querySelector(".sidebar-tab.active");
        this.renderSidebarList(active ? active.dataset.tab : "playlist");
      });

      on(this.dom.playlistSort, "change", () => {
        this.sortPlaylist(this.dom.playlistSort.value);
      });

      on(this.dom.addFirstFileBtn, "click", () => this.dom.videoInput.click());

      on(this.dom.clearPlaylistBtn, "click", () => {
        if (this.playlist.length === 0) return;
        if (!confirm("همه‌ی فایل‌ها از پلی‌لیست حذف بشن؟")) return;
        this.revokeAll();
        this.playlist = [];
        this.currentIndex = -1;
        this.dom.videoPlayer.removeAttribute("src");
        this.dom.videoPlayer.load();
        this.renderPlaylist();
        this.updatePlayerUI();
        toast("پلی‌لیست پاک شد", "success");
      });
    },

    /* =================================================
       نمایش view
       ================================================= */
    showView(name) {
      $$(".view").forEach((v) => v.classList.remove("active"));
      const target = $("view" + name.charAt(0).toUpperCase() + name.slice(1));
      if (target) target.classList.add("active");
    },

    /* =================================================
       افزودن فایل‌ها
       ================================================= */
    bindUpload() {
      on(this.dom.pickVideoBtn, "click", () => this.dom.videoInput.click());
      on(this.dom.pickImageBtn, "click", () => this.dom.imageInput.click());
      on(this.dom.pickFolderBtn, "click", () => this.dom.folderInput.click());
      on(this.dom.addFirstPhotoBtn, "click", () => this.dom.imageInput.click());

      on(this.dom.videoInput, "change", (e) => this.handleFiles(e.target.files, "video"));
      on(this.dom.imageInput, "change", (e) => this.handleFiles(e.target.files, "image"));
      on(this.dom.folderInput, "change", (e) => this.handleFiles(e.target.files, "auto"));

      // drag & drop
      const dz = this.dom.dropZone;
      const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => on(window, ev, prevent, false));

      on(window, "dragenter", () => dz && dz.classList.add("drag-active"));
      on(window, "dragover", () => dz && dz.classList.add("drag-active"));
      on(window, "dragleave", (e) => {
        if (e.clientX <= 0 || e.clientY <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          dz && dz.classList.remove("drag-active");
        }
      });
      on(window, "drop", (e) => {
        dz && dz.classList.remove("drag-active");
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) this.handleFiles(files, "auto");
      });
    },

    handleFiles(fileList, mode) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      let addedVid = 0, addedImg = 0;

      files.forEach((file) => {
        const name = file.name || "بدون‌نام";
        if (mode === "video" || (mode === "auto" && isVideoFile(file))) {
          if (!isVideoFile(file) && mode === "video") return;
          const item = {
            id: uid(),
            file: file,
            url: URL.createObjectURL(file),
            name: name,
            size: file.size,
            duration: 0,
            thumb: null,
            type: "video"
          };
          this.playlist.push(item);
          this.generateThumb(item);
          addedVid++;
        } else if (mode === "image" || (mode === "auto" && isImageFile(file))) {
          if (!isImageFile(file) && mode === "image") return;
          const item = {
            id: uid(),
            file: file,
            url: URL.createObjectURL(file),
            name: name,
            size: file.size,
            type: "image"
          };
          this.gallery.push(item);
          addedImg++;
        }
      });

      if (addedVid) {
        this.renderPlaylist();
        toast(addedVid + " ویدیو اضافه شد", "success");
        if (this.currentIndex === -1) this.playIndex(0);
      }
      if (addedImg) {
        this.renderGallery();
        toast(addedImg + " عکس اضافه شد", "success");
      }
      if (!addedVid && !addedImg) toast("فایلی قابل اضافه کردن نبود", "error");

      // پاک کردن ورودی
      this.dom.videoInput.value = "";
      this.dom.imageInput.value = "";
      this.dom.folderInput.value = "";
    },

    generateThumb(item) {
      const v = document.createElement("video");
      v.src = item.url;
      v.muted = true;
      v.playsInline = true;
      v.preload = "metadata";

      const done = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(v, 0, 0, 160, 90);
          item.thumb = canvas.toDataURL("image/jpeg", 0.6);
          this.renderPlaylist();
        } catch (e) {}
        v.remove();
      };

      on(v, "loadedmetadata", () => {
        item.duration = v.duration || 0;
        this.renderPlaylist();
        try { v.currentTime = Math.min(1, (v.duration || 2) / 3); }
        catch (e) { done(); }
      });

      on(v, "seeked", done);
      on(v, "error", () => { v.remove(); });
    },

    /* =================================================
       رندر پلی‌لیست
       ================================================= */
    sortPlaylist(mode) {
      if (mode === "manual") { this.renderPlaylist(); return; }
      this.playlist.sort((a, b) => {
        if (mode === "name") return a.name.localeCompare(b.name, "fa");
        if (mode === "duration") return (b.duration || 0) - (a.duration || 0);
        if (mode === "size") return (b.size || 0) - (a.size || 0);
        if (mode === "date") return 0;
        return 0;
      });
      this.renderPlaylist();
    },

    renderPlaylist() {
      const list = this.dom.playlistList;
      if (!list) return;
      list.innerHTML = "";

      const q = (this.dom.playlistSearch.value || "").trim().toLowerCase();
      const filtered = this.playlist.filter((p) => p.name.toLowerCase().includes(q));

      if (filtered.length === 0) {
        const e = document.createElement("div");
        e.className = "empty-state";
        e.innerHTML = this.playlist.length === 0
          ? '<p>پلی‌لیستت خالیه</p><button class="btn btn-primary" id="addFirstFileBtn2">افزودن فایل</button>'
          : '<p>چیزی پیدا نشد</p>';
        list.appendChild(e);
        const b2 = $("addFirstFileBtn2");
        if (b2) on(b2, "click", () => this.dom.videoInput.click());
        return;
      }

      filtered.forEach((item) => {
        const realIdx = this.playlist.indexOf(item);
        const el = document.createElement("div");
        el.className = "playlist-item" + (realIdx === this.currentIndex ? " active" : "");
        el.dataset.id = item.id;
        el.dataset.index = realIdx;
        el.draggable = true;

        const thumbHTML = item.thumb
          ? '<img src="' + item.thumb + '" alt="">'
          : '<span>' + (item.type === "image" ? "عکس" : "ویدیو") + '</span>';

        el.innerHTML =
          '<div class="playlist-thumb">' + thumbHTML + '</div>' +
          '<div class="playlist-info">' +
            '<span class="playlist-name">' + this.escape(item.name) + '</span>' +
            '<span class="playlist-meta">' +
              '<span>' + (item.duration ? formatTime(item.duration) : "--:--") + '</span>' +
              '<span>' + formatBytes(item.size) + '</span>' +
            '</span>' +
          '</div>' +
          '<span class="playlist-drag"></span>';

        on(el, "click", () => {
          if (item.type === "video") this.playIndex(realIdx);
          else this.openPhotoByItem(item);
        });

        on(el, "contextmenu", (e) => {
          e.preventDefault();
          this.openContextMenu(e.clientX, e.clientY, realIdx);
        });

        // drag reorder
        on(el, "dragstart", (e) => {
          e.dataTransfer.setData("text/plain", String(realIdx));
          el.classList.add("dragging");
        });
        on(el, "dragend", () => el.classList.remove("dragging"));
        on(el, "dragover", (e) => { e.preventDefault(); el.classList.add("drag-over"); });
        on(el, "dragleave", () => el.classList.remove("drag-over"));
        on(el, "drop", (e) => {
          e.preventDefault();
          el.classList.remove("drag-over");
          const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
          const to = realIdx;
          if (isNaN(from) || from === to) return;
          const moved = this.playlist.splice(from, 1)[0];
          this.playlist.splice(to, 0, moved);
          if (this.currentIndex === from) this.currentIndex = to;
          else if (this.currentIndex > from && this.currentIndex <= to) this.currentIndex--;
          else if (this.currentIndex < from && this.currentIndex >= to) this.currentIndex++;
          this.renderPlaylist();
        });

        list.appendChild(el);
      });

      if (this.dom.playlistCount) this.dom.playlistCount.textContent = this.playlist.length + " فایل";
    },

    renderSidebarList(tab) {
      if (tab === "playlist") { this.renderPlaylist(); return; }
      const list = this.dom.playlistList;
      list.innerHTML = "";

      if (tab === "history") {
        if (!this.history.length) {
          list.innerHTML = '<div class="empty-state"><p>تاریخچه خالیه</p></div>';
          return;
        }
        this.history.slice().reverse().forEach((h) => {
          const el = document.createElement("div");
          el.className = "playlist-item";
          el.innerHTML =
            '<div class="playlist-thumb">ت</div>' +
            '<div class="playlist-info">' +
              '<span class="playlist-name">' + this.escape(h.name) + '</span>' +
              '<span class="playlist-meta"><span>' + this.escape(h.date || "") + '</span></span>' +
            '</div>';
          list.appendChild(el);
        });
      } else if (tab === "bookmarks") {
        const cur = this.playlist[this.currentIndex];
        const arr = cur ? (this.bookmarks[cur.id] || []) : [];
        if (!arr.length) {
          list.innerHTML = '<div class="empty-state"><p>بوک‌مارکی نداری</p></div>';
          return;
        }
        arr.forEach((b) => {
          const el = document.createElement("div");
          el.className = "playlist-item";
          el.innerHTML =
            '<div class="playlist-thumb">ب</div>' +
            '<div class="playlist-info">' +
              '<span class="playlist-name">' + this.escape(b.name) + '</span>' +
              '<span class="playlist-meta"><span>' + formatTime(b.time) + '</span></span>' +
            '</div>';
          on(el, "click", () => {
            const v = this.dom.videoPlayer;
            if (v && isFinite(v.duration)) v.currentTime = b.time;
          });
          list.appendChild(el);
        });
      } else if (tab === "notes") {
        const cur = this.playlist[this.currentIndex];
        const arr = cur ? (this.notes[cur.id] || []) : [];
        if (!arr.length) {
          list.innerHTML = '<div class="empty-state"><p>یادداشتی نداری</p></div>';
          return;
        }
        arr.forEach((n) => {
          const el = document.createElement("div");
          el.className = "playlist-item";
          el.innerHTML =
            '<div class="playlist-thumb">ی</div>' +
            '<div class="playlist-info">' +
              '<span class="playlist-name">' + this.escape(n.text) + '</span>' +
              '<span class="playlist-meta"><span>' + formatTime(n.time) + '</span></span>' +
            '</div>';
          on(el, "click", () => {
            const v = this.dom.videoPlayer;
            if (v && isFinite(v.duration)) v.currentTime = n.time;
          });
          list.appendChild(el);
        });
      }
    },

    escape(str) {
      return String(str || "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    },

    /* =================================================
       پخش ویدیو
       ================================================= */
    playIndex(idx) {
      if (idx < 0 || idx >= this.playlist.length) return;
      const item = this.playlist[idx];
      if (!item || item.type !== "video") return;

      this.currentIndex = idx;
      const v = this.dom.videoPlayer;
      v.src = item.url;
      v.load();
      v.playbackRate = this.settings.defaultSpeed || 1;
      v.volume = this.settings.defaultVolume;

      if (this.dom.videoTitle) this.dom.videoTitle.textContent = item.name;
      if (this.dom.videoMeta) this.dom.videoMeta.textContent = formatBytes(item.size);

      this.showView("player");
      // همگام‌سازی نویگیشن بالا
      $$(".nav-btn", this.dom.appNav).forEach((b) => b.classList.toggle("active", b.dataset.view === "player"));

      // progress ذخیره‌شده
      if (this.settings.rememberProgress) {
        const prog = loadLS("progress." + item.id, 0);
        if (prog > 2 && isFinite(prog)) {
          v.currentTime = prog;
        }
      }

      if (this.settings.autoPlay) {
        v.play().catch(() => {});
      }

      this.renderPlaylist();
      this.renderBookmarksOnTimeline();
      this.updatePlayerUI();

      // ثبت تاریخچه
      this.history.push({
        id: item.id,
        name: item.name,
        date: new Date().toLocaleString("fa-IR")
      });
      if (this.history.length > 100) this.history.shift();
      saveLS("history", this.history);
    },

    /* =================================================
       بایند پلیر
       ================================================= */
    bindPlayer() {
      const v = this.dom.videoPlayer;

      on(v, "loadedmetadata", () => {
        this.updateTimelineBuffer();
        this.updatePlayerUI();
        const item = this.playlist[this.currentIndex];
        if (item && !item.duration) {
          item.duration = v.duration;
          this.renderPlaylist();
        }
      });

      on(v, "timeupdate", () => {
        this.updateTimeline();
        this.updateTimeDisplay();
        this.checkABLoop();
        if (this.settings.rememberProgress) {
          const item = this.playlist[this.currentIndex];
          if (item && v.currentTime > 2) saveLS("progress." + item.id, v.currentTime);
        }
      });

      on(v, "progress", () => this.updateTimelineBuffer());

      on(v, "play", () => {
        this.updatePlayIcon(true);
        this.hideBigPlay();
        this.hidePauseBlur();
        if (this.dom.extraStatus) this.dom.extraStatus.textContent = "در حال پخش";
      });

      on(v, "pause", () => {
        this.updatePlayIcon(false);
        if (!v.ended) {
          this.showBigPlay();
          this.showPauseBlur();
        }
        if (this.dom.extraStatus) this.dom.extraStatus.textContent = "متوقف";
      });

      on(v, "ended", () => {
        this.updatePlayIcon(false);
        this.hidePauseBlur();
        if (this.sleepEndOfVideo) {
          this.sleepEndOfVideo = false;
          toast("تایمر خواب: پایان ویدیو", "info");
          return;
        }
        const loop = this.dom.loopBtn.classList.contains("active");
        if (loop) {
          v.currentTime = 0;
          v.play().catch(() => {});
          return;
        }
        if (this.settings.autoNext && this.currentIndex < this.playlist.length - 1) {
          this.playIndex(this.currentIndex + 1);
        }
      });

      on(v, "volumechange", () => {
        this.dom.volumeSlider.value = v.volume;
        this.updateVolumeIcon();
        this.settings.defaultVolume = v.volume;
      });

      on(v, "ratechange", () => {
        this.dom.speedLabel.textContent = v.playbackRate + "x";
        this.dom.extraSpeed.textContent = v.playbackRate + "x";
      });

      on(v, "waiting", () => {
        if (this.dom.extraStatus) this.dom.extraStatus.textContent = "در حال بارگذاری";
      });
      on(v, "playing", () => {
        if (this.dom.extraStatus) this.dom.extraStatus.textContent = "در حال پخش";
      });

      // کلیک روی ویدیو = پخش/توقف
      on(this.dom.videoWrapper, "click", (e) => {
        if (e.target.closest(".controls-bar")) return;
        if (e.target.closest(".big-play-btn")) return;
        if (e.target.closest(".video-top-overlay")) return;
        this.togglePlay();
      });

      on(this.dom.bigPlayBtn, "click", (e) => {
        e.stopPropagation();
        this.togglePlay();
      });

      on(this.dom.closeVideoBtn, "click", (e) => {
        e.stopPropagation();
        v.pause();
        v.removeAttribute("src");
        v.load();
        this.currentIndex = -1;
        this.renderPlaylist();
        this.updatePlayerUI();
        this.showView("upload");
      });

      on(this.dom.miniModeBtn, "click", (e) => {
        e.stopPropagation();
        this.toggleMiniMode();
      });
    },

    togglePlay() {
      const v = this.dom.videoPlayer;
      if (!v.src) { toast("اول یه ویدیو انتخاب کن", "info"); return; }
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    },

    updatePlayIcon(isPlaying) {
      const svg = this.dom.playPauseIcon;
      if (!svg) return;
      if (isPlaying) {
        svg.innerHTML = '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>';
      } else {
        svg.innerHTML = '<path d="M8 5v14l11-7z" fill="currentColor"/>';
      }
    },

    showBigPlay() { this.dom.bigPlayBtn && this.dom.bigPlayBtn.classList.add("show"); },
    hideBigPlay() { this.dom.bigPlayBtn && this.dom.bigPlayBtn.classList.remove("show"); },
    showPauseBlur() { this.dom.pauseBlur && this.dom.pauseBlur.classList.add("active"); },
    hidePauseBlur() { this.dom.pauseBlur && this.dom.pauseBlur.classList.remove("active"); },

    toggleMiniMode() {
      this.miniMode = !this.miniMode;
      this.dom.videoWrapper.classList.toggle("mini-mode", this.miniMode);
    },

    /* =================================================
       نوار تایم
       ================================================= */
    bindTimeline() {
      const tl = this.dom.timeline;
      const v = this.dom.videoPlayer;

      const seekFromEvent = (e) => {
        const rect = tl.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const pct = x / rect.width;
        if (isFinite(v.duration)) v.currentTime = pct * v.duration;
      };

      on(tl, "mousedown", (e) => {
        this.isSeeking = true;
        tl.classList.add("dragging");
        seekFromEvent(e);
      });

      on(window, "mousemove", (e) => {
        if (this.isSeeking) seekFromEvent(e);
      });

      on(window, "mouseup", () => {
        if (this.isSeeking) {
          this.isSeeking = false;
          tl.classList.remove("dragging");
        }
      });

      // پیش‌نمایش
      on(tl, "mousemove", (e) => this.showTimelinePreview(e));
      on(tl, "mouseleave", () => this.hideTimelinePreview());

      // لمس
      on(tl, "touchstart", (e) => {
        this.isSeeking = true;
        const t = e.touches[0];
        seekFromEvent(t);
      });
      on(window, "touchmove", (e) => {
        if (this.isSeeking) {
          const t = e.touches[0];
          seekFromEvent(t);
          this.showTimelinePreview(t);
        }
      });
      on(window, "touchend", () => {
        this.isSeeking = false;
        this.hideTimelinePreview();
      });
    },

    updateTimeline() {
      const v = this.dom.videoPlayer;
      if (!isFinite(v.duration) || v.duration === 0) return;
      const pct = (v.currentTime / v.duration) * 100;
      this.dom.timelineProgress.style.width = pct + "%";
      this.dom.timelineThumb.style.left = pct + "%";
    },

    updateTimelineBuffer() {
      const v = this.dom.videoPlayer;
      if (!v.buffered || !v.buffered.length || !isFinite(v.duration)) return;
      let end = 0;
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) {
          end = v.buffered.end(i);
          break;
        }
      }
      this.dom.timelineBuffer.style.width = ((end / v.duration) * 100) + "%";
    },

    showTimelinePreview(e) {
      const tl = this.dom.timeline;
      const v = this.dom.videoPlayer;
      if (!isFinite(v.duration)) return;

      const rect = tl.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const pct = x / rect.width;
      const time = pct * v.duration;

      const prev = this.dom.timelinePreview;
      const prevRect = prev.getBoundingClientRect();
      let left = x;
      if (left - prevRect.width / 2 < 0) left = prevRect.width / 2;
      if (left + prevRect.width / 2 > rect.width) left = rect.width - prevRect.width / 2;
      prev.style.left = left + "px";
      prev.classList.add("show");
      this.dom.timelinePreviewTime.textContent = formatTime(time);

      // فریم پیش‌نمایش
      const canvas = this.dom.timelinePreviewCanvas;
      const ctx = canvas.getContext("2d");
      const hidden = this._previewVideo || (this._previewVideo = document.createElement("video"));
      hidden.muted = true;
      hidden.playsInline = true;
      hidden.src = v.src;
      hidden.preload = "auto";

      const draw = () => {
        try { ctx.drawImage(hidden, 0, 0, canvas.width, canvas.height); } catch (er) {}
      };

      if (hidden.readyState >= 2) {
        try { hidden.currentTime = time; } catch (er) {}
        setTimeout(draw, 30);
      } else {
        on(hidden, "loadeddata", () => {
          try { hidden.currentTime = time; } catch (er) {}
          setTimeout(draw, 50);
        }, { once: true });
      }
    },

    hideTimelinePreview() {
      this.dom.timelinePreview.classList.remove("show");
    },

    updateTimeDisplay() {
      const v = this.dom.videoPlayer;
      if (this.dom.timeDisplay) {
        this.dom.timeDisplay.textContent =
          formatTime(v.currentTime) + " / " + formatTime(v.duration || 0);
      }
    },

    renderBookmarksOnTimeline() {
      const v = this.dom.videoPlayer;
      const wrap = this.dom.timelineBookmarks;
      if (!wrap) return;
      wrap.innerHTML = "";
      const item = this.playlist[this.currentIndex];
      if (!item) return;
      const arr = this.bookmarks[item.id] || [];
      arr.forEach((b) => {
        if (!isFinite(v.duration) || v.duration === 0) return;
        const pct = (b.time / v.duration) * 100;
        const mark = document.createElement("span");
        mark.className = "timeline-bookmark-mark";
        mark.style.left = pct + "%";
        mark.title = b.name;
        wrap.appendChild(mark);
      });
    },

    /* =================================================
       کنترل‌های پایین
       ================================================= */
    bindControls() {
      const v = this.dom.videoPlayer;

      on(this.dom.playPauseBtn, "click", () => this.togglePlay());

      on(this.dom.prevBtn, "click", () => {
        if (this.currentIndex > 0) this.playIndex(this.currentIndex - 1);
      });
      on(this.dom.nextBtn, "click", () => {
        if (this.currentIndex < this.playlist.length - 1) this.playIndex(this.currentIndex + 1);
      });

      on(this.dom.rewindBtn, "click", () => {
        v.currentTime = Math.max(0, v.currentTime - 10);
      });
      on(this.dom.forwardBtn, "click", () => {
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
      });

      on(this.dom.muteBtn, "click", () => {
        v.muted = !v.muted;
        this.updateVolumeIcon();
      });
      on(this.dom.volumeSlider, "input", (e) => {
        v.volume = parseFloat(e.target.value);
        v.muted = v.volume === 0;
      });

      // سرعت
      on(this.dom.speedBtn, "click", (e) => {
        e.stopPropagation();
        this.dom.speedMenu.classList.toggle("show");
      });
      $$(".popup-item", this.dom.speedMenu).forEach((b) => {
        on(b, "click", (e) => {
          e.stopPropagation();
          const s = parseFloat(b.dataset.speed);
          v.playbackRate = s;
          this.settings.defaultSpeed = s;
          this.saveSettings();
          $$(".popup-item", this.dom.speedMenu).forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          this.dom.speedMenu.classList.remove("show");
          toast("سرعت: " + s + "x", "info", 1400);
        });
      });
      on(document, "click", (e) => {
        if (!e.target.closest(".speed-wrap")) this.dom.speedMenu.classList.remove("show");
      });

      // اسکرین‌شات
      on(this.dom.screenshotBtn, "click", () => this.takeScreenshot());

      // بوک‌مارک
      on(this.dom.bookmarkBtn, "click", () => this.openBookmarkModal());

      // یادداشت
      on(this.dom.noteBtn, "click", () => this.openNoteModal());

      // زیرنویس
      on(this.dom.subtitleBtn, "click", () => this.openSubtitleModal());

      // حلقه
      on(this.dom.loopBtn, "click", () => {
        this.dom.loopBtn.classList.toggle("active");
        const on_ = this.dom.loopBtn.classList.contains("active");
        toast(on_ ? "پخش حلقه‌ای روشن" : "پخش حلقه‌ای خاموش", "info", 1500);
      });

      // AB Loop
      on(this.dom.abLoopBtn, "click", () => this.toggleABLoop());

      // فیلترها
      on(this.dom.filtersBtn, "click", () => this.openModal("filtersModal"));

      // چرخش
      on(this.dom.rotateBtn, "click", () => {
        const cur = parseInt(v.dataset.rotate || "0", 10);
        const next = (cur + 90) % 360;
        v.dataset.rotate = next;
        v.style.transform = "rotate(" + next + "deg)";
      });

      // آینه
      on(this.dom.mirrorBtn, "click", () => {
        const cur = v.dataset.mirror === "1";
        v.dataset.mirror = cur ? "0" : "1";
        v.style.transform = (v.style.transform || "") +
          (cur ? "" : " scaleX(-1)");
        // پاکسازی
        if (cur) {
          const rot = parseInt(v.dataset.rotate || "0", 10);
          v.style.transform = rot ? "rotate(" + rot + "deg)" : "";
        }
      });

      // PiP
      on(this.dom.pipBtn, "click", async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await v.requestPictureInPicture();
          }
        } catch (e) {
          toast("تصویر در تصویر پشتیبانی نمی‌شه", "error");
        }
      });

      // تایمر خواب
      on(this.dom.sleepTimerBtn, "click", () => this.openModal("sleepTimerModal"));

      // تمام‌صفحه
      on(this.dom.fullscreenBtn, "click", () => this.toggleFullscreen());
      on(this.dom.videoWrapper, "dblclick", (e) => {
        if (e.target.closest(".controls-bar")) return;
        this.toggleFullscreen();
      });

      on(document, "fullscreenchange", () => {
        const isFs = !!document.fullscreenElement;
        const svg = this.dom.fullscreenIcon;
        if (svg) {
          if (isFs) {
            svg.innerHTML = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
          } else {
            svg.innerHTML = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
          }
        }
      });
    },

    updateVolumeIcon() {
      const v = this.dom.videoPlayer;
      const svg = this.dom.volumeIcon;
      if (!svg) return;
      if (v.muted || v.volume === 0) {
        svg.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M22 9l-6 6M16 9l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
      } else if (v.volume < 0.5) {
        svg.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
      } else {
        svg.innerHTML = '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
      }
    },

    toggleFullscreen() {
      const el = this.dom.videoWrapper;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    },

    /* =================================================
       AB Loop
       ================================================= */
    toggleABLoop() {
      const v = this.dom.videoPlayer;
      const ab = this.abLoop;
      const btn = this.dom.abLoopBtn;

      if (ab.a === null) {
        ab.a = v.currentTime;
        btn.classList.add("active");
        toast("نقطه A: " + formatTime(ab.a), "info", 1600);
      } else if (ab.b === null) {
        ab.b = v.currentTime;
        if (ab.b <= ab.a) {
          const t = ab.a; ab.a = ab.b; ab.b = t;
        }
        this.showABOnTimeline();
        toast("نقطه B: " + formatTime(ab.b), "success", 1600);
      } else {
        ab.a = null; ab.b = null;
        btn.classList.remove("active");
        this.dom.timelineAB.classList.remove("show");
        toast("تکرار A-B خاموش", "info", 1400);
      }
    },

    showABOnTimeline() {
      const v = this.dom.videoPlayer;
      const ab = this.abLoop;
      if (ab.a === null || ab.b === null || !isFinite(v.duration)) return;
      const el = this.dom.timelineAB;
      el.classList.add("show");
      el.style.left = (ab.a / v.duration * 100) + "%";
      el.style.width = ((ab.b - ab.a) / v.duration * 100) + "%";
    },

    checkABLoop() {
      const v = this.dom.videoPlayer;
      const ab = this.abLoop;
      if (ab.a !== null && ab.b !== null && v.currentTime >= ab.b) {
        v.currentTime = ab.a;
      }
    },

    /* =================================================
       اسکرین‌شات
       ================================================= */
    takeScreenshot() {
      const v = this.dom.videoPlayer;
      if (!v.src || !v.videoWidth) { toast("ویدیویی پخش نمی‌شه", "error"); return; }
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext("2d").drawImage(v, 0, 0);
        const url = c.toDataURL("image/png");
        this.dom.screenshotPreview.src = url;
        this._lastScreenshot = url;
        this.openModal("screenshotModal");
      } catch (e) {
        toast("عکس‌برداری ناموفق", "error");
      }
    },

    /* =================================================
       بوک‌مارک و یادداشت
       ================================================= */
    openBookmarkModal() {
      const v = this.dom.videoPlayer;
      if (!v.src) { toast("اول یه ویدیو پخش کن", "info"); return; }
      this.dom.bookmarkTimeLabel.textContent = formatTime(v.currentTime);
      this.dom.bookmarkNameInput.value = "";
      this._pendingBookmarkTime = v.currentTime;
      this.openModal("bookmarkModal");
    },

    saveBookmark() {
      const item = this.playlist[this.currentIndex];
      if (!item) return;
      const name = (this.dom.bookmarkNameInput.value || "").trim() || "بوک‌مارک " + (this.bookmarks[item.id] || []).length + 1;
      if (!this.bookmarks[item.id]) this.bookmarks[item.id] = [];
      this.bookmarks[item.id].push({ id: uid(), time: this._pendingBookmarkTime || 0, name: name });
      saveLS("bookmarks", this.bookmarks);
      this.closeModal("bookmarkModal");
      this.renderBookmarksOnTimeline();
      toast("بوک‌مارک ذخیره شد", "success");
    },

    openNoteModal() {
      const v = this.dom.videoPlayer;
      if (!v.src) { toast("اول یه ویدیو پخش کن", "info"); return; }
      this.dom.noteTimeLabel.textContent = formatTime(v.currentTime);
      this.dom.noteTextInput.value = "";
      this._pendingNoteTime = v.currentTime;
      this.openModal("noteModal");
    },

    saveNote() {
      const item = this.playlist[this.currentIndex];
      if (!item) return;
      const text = (this.dom.noteTextInput.value || "").trim();
      if (!text) { toast("متن یادداشت خالیه", "error"); return; }
      if (!this.notes[item.id]) this.notes[item.id] = [];
      this.notes[item.id].push({ id: uid(), time: this._pendingNoteTime || 0, text: text });
      saveLS("notes", this.notes);
      this.closeModal("noteModal");
      toast("یادداشت ذخیره شد", "success");
    },

    /* =================================================
       زیرنویس
       ================================================= */
    openSubtitleModal() {
      const item = this.playlist[this.currentIndex];
      if (!item) { toast("اول یه ویدیو انتخاب کن", "info"); return; }
      this.renderSubtitleList();
      this.openModal("subtitleModal");
    },

    renderSubtitleList() {
      const item = this.playlist[this.currentIndex];
      const list = this.dom.subtitleList;
      list.innerHTML = "";
      if (!item) return;
      const arr = this.subtitles[item.id] || [];
      if (!arr.length) {
        list.innerHTML = '<div class="empty-state"><p>زیرنویسی اضافه نشده</p></div>';
        return;
      }
      arr.forEach((s, i) => {
        const el = document.createElement("div");
        el.className = "subtitle-item" + (s.active ? " active" : "");
        el.textContent = s.name;
        on(el, "click", () => {
          const v = this.dom.videoPlayer;
          $$("track", v).forEach((t) => t.remove());
          const track = document.createElement("track");
          track.kind = "subtitles";
          track.label = s.name;
          track.srclang = "fa";
          track.src = s.url;
          track.default = true;
          v.appendChild(track);
          s.active = true;
          this.subtitlesEnabled = true;
          this.renderSubtitleList();
          toast("زیرنویس فعال شد", "success");
        });
        list.appendChild(el);
      });
    },

    /* =================================================
       گالری و نمایش عکس
       ================================================= */
    renderGallery() {
      const grid = this.dom.galleryGrid;
      if (!grid) return;
      grid.innerHTML = "";

      const q = (this.dom.playlistSearch.value || "").trim().toLowerCase();
      let arr = this.gallery.slice();
      const sortMode = this.dom.gallerySort ? this.dom.gallerySort.value : "date";
      if (sortMode === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "fa"));
      if (sortMode === "size") arr.sort((a, b) => b.size - a.size);

      const filtered = arr.filter((g) => g.name.toLowerCase().includes(q));

      if (filtered.length === 0) {
        this.dom.galleryEmpty.classList.remove("hidden");
      } else {
        this.dom.galleryEmpty.classList.add("hidden");
      }

      filtered.forEach((img) => {
        const el = document.createElement("div");
        el.className = "gallery-item";
        el.innerHTML =
          '<img src="' + img.url + '" alt="' + this.escape(img.name) + '" loading="lazy">' +
          '<div class="gallery-item-info">' + this.escape(img.name) + '</div>';
        on(el, "click", () => this.openPhotoByItem(img));
        on(el, "contextmenu", (e) => {
          e.preventDefault();
          this._contextPhoto = img;
          this.openContextMenu(e.clientX, e.clientY, -1, true);
        });
        grid.appendChild(el);
      });
    },

    bindGallery() {
      on(this.dom.gallerySort, "change", () => this.renderGallery());

      on(this.dom.gallerySlideShowBtn, "click", () => {
        if (!this.gallery.length) { toast("عکسی نیست", "info"); return; }
        let i = 0;
        this.openPhotoByItem(this.gallery[0]);
        const id = setInterval(() => {
          if (this.dom.photoViewer.classList.contains("hidden")) {
            clearInterval(id); return;
          }
          i = (i + 1) % this.gallery.length;
          this.openPhotoByItem(this.gallery[i]);
        }, 3500);
      });
    },

    openPhotoByItem(item) {
      const idx = this.gallery.indexOf(item);
      this._photoIndex = idx >= 0 ? idx : 0;
      this._photoScale = 1;
      this._photoRotation = 0;
      this._photoTranslate = { x: 0, y: 0 };

      this.dom.photoImg.src = item.url;
      this.dom.photoName.textContent = item.name;
      this.dom.photoViewer.classList.remove("hidden");
      this.applyPhotoTransform();
    },

    bindPhotoViewer() {
      on(this.dom.photoClose, "click", () => this.closePhotoViewer());
      on(this.dom.photoViewerBackdrop, "click", () => this.closePhotoViewer());

      on(this.dom.photoPrev, "click", (e) => {
        e.stopPropagation();
        this.navigatePhoto(-1);
      });
      on(this.dom.photoNext, "click", (e) => {
        e.stopPropagation();
        this.navigatePhoto(1);
      });

      on(this.dom.photoZoomIn, "click", () => {
        this._photoScale = clamp(this._photoScale * 1.2, 0.2, 6);
        this.applyPhotoTransform();
      });
      on(this.dom.photoZoomOut, "click", () => {
        this._photoScale = clamp(this._photoScale / 1.2, 0.2, 6);
        this.applyPhotoTransform();
      });
      on(this.dom.photoRotate, "click", () => {
        this._photoRotation = (this._photoRotation + 90) % 360;
        this.applyPhotoTransform();
      });
      on(this.dom.photoReset, "click", () => {
        this._photoScale = 1;
        this._photoRotation = 0;
        this._photoTranslate = { x: 0, y: 0 };
        this.applyPhotoTransform();
      });
      on(this.dom.photoDownload, "click", () => {
        const cur = this.gallery[this._photoIndex];
        if (!cur) return;
        const a = document.createElement("a");
        a.href = cur.url;
        a.download = cur.name;
        a.click();
      });

      // pan با ماوس
      let panning = false, startX = 0, startY = 0;
      on(this.dom.photoStage, "mousedown", (e) => {
        panning = true;
        startX = e.clientX - this._photoTranslate.x;
        startY = e.clientY - this._photoTranslate.y;
      });
      on(window, "mousemove", (e) => {
        if (!panning) return;
        this._photoTranslate.x = e.clientX - startX;
        this._photoTranslate.y = e.clientY - startY;
        this.applyPhotoTransform();
      });
      on(window, "mouseup", () => { panning = false; });

      // wheel zoom
      on(this.dom.photoStage, "wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        this._photoScale = clamp(this._photoScale * delta, 0.2, 6);
        this.applyPhotoTransform();
      }, { passive: false });

      // کیبورد فقط برای عکس
      on(window, "keydown", (e) => {
        if (this.dom.photoViewer.classList.contains("hidden")) return;
        if (e.key === "ArrowLeft") this.navigatePhoto(1);
        if (e.key === "ArrowRight") this.navigatePhoto(-1);
        if (e.key === "Escape") this.closePhotoViewer();
      });
    },

    applyPhotoTransform() {
      this.dom.photoImg.style.transform =
        "translate(" + this._photoTranslate.x + "px," + this._photoTranslate.y + "px) " +
        "scale(" + this._photoScale + ") rotate(" + this._photoRotation + "deg)";
    },

    navigatePhoto(dir) {
      if (!this.gallery.length) return;
      this._photoIndex = (this._photoIndex + dir + this.gallery.length) % this.gallery.length;
      const item = this.gallery[this._photoIndex];
      this.dom.photoImg.src = item.url;
      this.dom.photoName.textContent = item.name;
      this._photoScale = 1;
      this._photoRotation = 0;
      this._photoTranslate = { x: 0, y: 0 };
      this.applyPhotoTransform();
    },

    closePhotoViewer() {
      this.dom.photoViewer.classList.add("hidden");
    },

    /* =================================================
       پنل تنظیمات
       ================================================= */
    bindSettingsPanel() {
      on(this.dom.settingsClose, "click", () => this.closeSettings());
      on(this.dom.settingsOverlay, "click", () => this.closeSettings());

      $$(".segmented button", this.dom.themeSegment).forEach((b) => {
        on(b, "click", () => {
          this.setTheme(b.dataset.theme);
          this.applySettings();
        });
      });

      on(this.dom.glassOpacitySlider, "input", (e) => {
        this.settings.glassOpacity = parseInt(e.target.value, 10);
        this.dom.glassOpacityValue.textContent = this.settings.glassOpacity + "%";
        this.applySettings();
        this.saveSettings();
      });

      on(this.dom.blurIntensitySlider, "input", (e) => {
        this.settings.blurIntensity = parseInt(e.target.value, 10);
        this.dom.blurIntensityValue.textContent = this.settings.blurIntensity + "px";
        this.applySettings();
        this.saveSettings();
      });

      on(this.dom.bloomIntensitySlider, "input", (e) => {
        this.settings.bloomIntensity = parseInt(e.target.value, 10);
        this.dom.bloomIntensityValue.textContent = this.settings.bloomIntensity + "%";
        this.applySettings();
        this.saveSettings();
      });

      on(this.dom.reduceMotionToggle, "change", (e) => {
        this.settings.reduceMotion = e.target.checked;
        this.applySettings();
        this.saveSettings();
      });

      on(this.dom.highContrastToggle, "change", (e) => {
        this.settings.highContrast = e.target.checked;
        this.applySettings();
        this.saveSettings();
      });

      on(this.dom.defaultVolumeSlider, "input", (e) => {
        this.settings.defaultVolume = parseFloat(e.target.value);
        this.dom.defaultVolumeValue.textContent = Math.round(this.settings.defaultVolume * 100) + "%";
        this.dom.videoPlayer.volume = this.settings.defaultVolume;
        this.saveSettings();
      });

      on(this.dom.defaultSpeedSelect, "change", (e) => {
        this.settings.defaultSpeed = parseFloat(e.target.value);
        this.dom.videoPlayer.playbackRate = this.settings.defaultSpeed;
        this.saveSettings();
      });

      on(this.dom.autoPlayToggle, "change", (e) => {
        this.settings.autoPlay = e.target.checked;
        this.saveSettings();
      });

      on(this.dom.autoNextToggle, "change", (e) => {
        this.settings.autoNext = e.target.checked;
        this.saveSettings();
      });

      on(this.dom.rememberProgressToggle, "change", (e) => {
        this.settings.rememberProgress = e.target.checked;
        this.saveSettings();
      });

      on(this.dom.subtitleSizeSlider, "input", (e) => {
        this.settings.subtitleSize = parseInt(e.target.value, 10);
        this.dom.subtitleSizeValue.textContent = this.settings.subtitleSize;
        this.applySubtitleStyle();
        this.saveSettings();
      });

      on(this.dom.subtitleColorInput, "input", (e) => {
        this.settings.subtitleColor = e.target.value;
        this.applySubtitleStyle();
        this.saveSettings();
      });

      on(this.dom.subtitleBgToggle, "change", (e) => {
        this.settings.subtitleBg = e.target.checked;
        this.applySubtitleStyle();
        this.saveSettings();
      });

      on(this.dom.exportSettingsBtn, "click", () => this.exportSettings());
      on(this.dom.importSettingsBtn, "click", () => this.dom.importSettingsInput.click());
      on(this.dom.importSettingsInput, "change", (e) => this.importSettings(e.target.files[0]));
      on(this.dom.resetSettingsBtn, "click", () => {
        if (!confirm("همه‌ی تنظیمات به حالت اولیه برگرده؟")) return;
        localStorage.removeItem("liquidplay.settings");
        location.reload();
      });
    },

    applySubtitleStyle() {
      const v = this.dom.videoPlayer;
      const tracks = $$("track", v);
      tracks.forEach((t) => {
        t.style.fontSize = this.settings.subtitleSize + "px";
      });
    },

    openSettings() {
      this.dom.settingsPanel.classList.add("open");
      this.dom.settingsOverlay.classList.remove("hidden");
      requestAnimationFrame(() => this.dom.settingsOverlay.classList.add("show"));
    },

    closeSettings() {
      this.dom.settingsPanel.classList.remove("open");
      this.dom.settingsOverlay.classList.remove("show");
      setTimeout(() => this.dom.settingsOverlay.classList.add("hidden"), 300);
    },

    exportSettings() {
      const data = {
        settings: this.settings,
        bookmarks: this.bookmarks,
        notes: this.notes,
        history: this.history
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "liquidplay-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("پشتیبان دانلود شد", "success");
    },

    importSettings(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.settings) this.settings = Object.assign(this.settings, data.settings);
          if (data.bookmarks) this.bookmarks = data.bookmarks;
          if (data.notes) this.notes = data.notes;
          if (data.history) this.history = data.history;
          saveLS("settings", this.settings);
          saveLS("bookmarks", this.bookmarks);
          saveLS("notes", this.notes);
          saveLS("history", this.history);
          this.applySettings();
          toast("تنظیمات بازیابی شد", "success");
        } catch (er) {
          toast("فایل نامعتبر", "error");
        }
      };
      reader.readAsText(file);
      this.dom.importSettingsInput.value = "";
    },

    /* =================================================
       مودال‌ها
       ================================================= */
    bindModals() {
      // دکمه‌های بستن
      $$("[data-close-modal]").forEach((b) => {
        on(b, "click", () => this.closeModal(b.dataset.closeModal));
      });

      $$(".modal-overlay").forEach((ov) => {
        on(ov, "click", (e) => {
          if (e.target === ov) this.closeModal(ov.id);
        });
      });

      // ذخیره بوک‌مارک
      on(this.dom.bookmarkSaveBtn, "click", () => this.saveBookmark());

      // ذخیره یادداشت
      on(this.dom.noteSaveBtn, "click", () => this.saveNote());

      // دانلود اسکرین‌شات
      on(this.dom.screenshotDownloadBtn, "click", () => {
        if (!this._lastScreenshot) return;
        const a = document.createElement("a");
        a.href = this._lastScreenshot;
        a.download = "liquidplay-screenshot-" + Date.now() + ".png";
        a.click();
      });

      // کپی اسکرین‌شات
      on(this.dom.screenshotCopyBtn, "click", async () => {
        if (!this._lastScreenshot) return;
        try {
          const blob = await (await fetch(this._lastScreenshot)).blob();
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast("کپی شد", "success");
        } catch (e) {
          toast("کپی ناموفق", "error");
        }
      });

      // تایمر خواب
      $$("[data-sleep]", this.dom.sleepTimerModal).forEach((b) => {
        on(b, "click", () => this.setSleepTimer(b.dataset.sleep));
      });

      // زیرنویس
      on(this.dom.loadSubtitleBtn, "click", () => this.dom.subtitleInput.click());
      on(this.dom.subtitleInput, "change", (e) => this.loadSubtitleFile(e.target.files[0]));
      on(this.dom.removeSubtitleBtn, "click", () => {
        const item = this.playlist[this.currentIndex];
        if (!item) return;
        this.subtitles[item.id] = [];
        $$("track", this.dom.videoPlayer).forEach((t) => t.remove());
        this.renderSubtitleList();
        toast("زیرنویس حذف شد", "info");
      });

      // فیلترها
      const bindFilter = (el, valEl, key, suffix) => {
        on(el, "input", () => {
          const val = el.value;
          valEl.textContent = val + (suffix || "");
          this.applyFilters();
        });
      };
      bindFilter(this.dom.filterBrightness, this.dom.filterBrightnessValue, "brightness", "%");
      bindFilter(this.dom.filterContrast, this.dom.filterContrastValue, "contrast", "%");
      bindFilter(this.dom.filterSaturate, this.dom.filterSaturateValue, "saturate", "%");
      bindFilter(this.dom.filterHue, this.dom.filterHueValue, "hue", "");
      bindFilter(this.dom.filterBlur, this.dom.filterBlurValue, "blur", "px");

      on(this.dom.resetFiltersBtn, "click", () => {
        this.dom.filterBrightness.value = 100;
        this.dom.filterContrast.value = 100;
        this.dom.filterSaturate.value = 100;
        this.dom.filterHue.value = 0;
        this.dom.filterBlur.value = 0;
        this.dom.filterBrightnessValue.textContent = "100%";
        this.dom.filterContrastValue.textContent = "100%";
        this.dom.filterSaturateValue.textContent = "100%";
        this.dom.filterHueValue.textContent = "0";
        this.dom.filterBlurValue.textContent = "0px";
        this.applyFilters();
      });
    },

    applyFilters() {
      const v = this.dom.videoPlayer;
      const b = this.dom.filterBrightness.value;
      const c = this.dom.filterContrast.value;
      const s = this.dom.filterSaturate.value;
      const h = this.dom.filterHue.value;
      const bl = this.dom.filterBlur.value;
      v.style.filter =
        "brightness(" + b + "%) contrast(" + c + "%) saturate(" + s + "%) hue-rotate(" + h + "deg) blur(" + bl + "px)";
    },

    loadSubtitleFile(file) {
      if (!file) return;
      const item = this.playlist[this.currentIndex];
      if (!item) return;
      const url = URL.createObjectURL(file);
      if (!this.subtitles[item.id]) this.subtitles[item.id] = [];
      this.subtitles[item.id].push({ name: file.name, url: url, active: false });
      this.renderSubtitleList();
      toast("زیرنویس اضافه شد", "success");
    },

    setSleepTimer(mode) {
      if (this.sleepTimer) { clearTimeout(this.sleepTimer); this.sleepTimer = null; }
      this.sleepEndOfVideo = false;

      if (mode === "off") {
        toast("تایمر خواب خاموش", "info");
        this.closeModal("sleepTimerModal");
        return;
      }
      if (mode === "end") {
        this.sleepEndOfVideo = true;
        toast("پخش بعد از این ویدیو متوقف می‌شه", "info");
        this.closeModal("sleepTimerModal");
        return;
      }
      const mins = parseInt(mode, 10);
      this.sleepTimer = setTimeout(() => {
        this.dom.videoPlayer.pause();
        toast("تایمر خواب فعال شد", "info");
        this.sleepTimer = null;
      }, mins * 60000);
      toast("تایمر خواب: " + mins + " دقیقه", "success");
      this.closeModal("sleepTimerModal");
    },

    openModal(id) {
      const m = $(id);
      if (!m) return;
      m.classList.remove("hidden");
      requestAnimationFrame(() => m.classList.add("show"));
    },

    closeModal(id) {
      const m = $(id);
      if (!m) return;
      m.classList.remove("show");
      setTimeout(() => m.classList.add("hidden"), 260);
    },

    /* =================================================
       کیبورد
       ================================================= */
    bindKeyboard() {
      on(window, "keydown", (e) => {
        // اگه توی input بودیم، کاری نکن
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

        // عکس بازه؟
        if (!this.dom.photoViewer.classList.contains("hidden")) return;

        const v = this.dom.videoPlayer;

        switch (e.key) {
          case " ":
          case "k":
            e.preventDefault();
            this.togglePlay();
            break;
          case "ArrowLeft":
            e.preventDefault();
            v.currentTime = Math.max(0, v.currentTime - 5);
            break;
          case "ArrowRight":
            e.preventDefault();
            v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
            break;
          case "j":
          case "J":
            v.currentTime = Math.max(0, v.currentTime - 10);
            break;
          case "l":
          case "L":
            v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
            break;
          case "ArrowUp":
            e.preventDefault();
            v.volume = clamp(v.volume + 0.05, 0, 1);
            v.muted = false;
            toast("صدا: " + Math.round(v.volume * 100) + "%", "info", 900);
            break;
          case "ArrowDown":
            e.preventDefault();
            v.volume = clamp(v.volume - 0.05, 0, 1);
            toast("صدا: " + Math.round(v.volume * 100) + "%", "info", 900);
            break;
          case "m":
          case "M":
            v.muted = !v.muted;
            this.updateVolumeIcon();
            break;
          case "f":
          case "F":
            this.toggleFullscreen();
            break;
          case "p":
          case "P":
            if (document.pictureInPictureElement) document.exitPictureInPicture();
            else v.requestPictureInPicture && v.requestPictureInPicture().catch(() => {});
            break;
          case "+":
          case "=":
            v.playbackRate = clamp(v.playbackRate + 0.25, 0.25, 3);
            this.dom.speedLabel.textContent = v.playbackRate + "x";
            break;
          case "-":
          case "_":
            v.playbackRate = clamp(v.playbackRate - 0.25, 0.25, 3);
            this.dom.speedLabel.textContent = v.playbackRate + "x";
            break;
          case "s":
          case "S":
            this.takeScreenshot();
            break;
          case "b":
          case "B":
            this.openBookmarkModal();
            break;
          case "n":
          case "N":
            this.openNoteModal();
            break;
          case "Escape":
            this.closeSettings();
            $$(".modal-overlay.show").forEach((m) => this.closeModal(m.id));
            break;
          default:
            // اعداد برای پرش درصدی
            if (/^[0-9]$/.test(e.key) && isFinite(v.duration)) {
              v.currentTime = (parseInt(e.key, 10) / 10) * v.duration;
            }
        }
      });
    },

    /* =================================================
       ژست‌ها
       ================================================= */
    bindGestures() {
      const wrap = this.dom.videoWrapper;
      const v = this.dom.videoPlayer;
      if (!wrap) return;

      let startX = 0, startY = 0, startTime = 0, startVolume = 0, startBrightness = 100;
      let gestureMode = null; // 'seek' | 'volume' | 'brightness'
      let lastTap = 0;
      let lastTapX = 0;

      const indicator = this.dom.gestureIndicator;
      const iconEl = this.dom.gestureIcon;
      const valEl = this.dom.gestureValue;

      const showInd = (icon, val) => {
        iconEl.textContent = icon;
        valEl.textContent = val;
        indicator.classList.add("show");
      };
      const hideInd = () => indicator.classList.remove("show");

      const isLeftZone = (x) => {
        const r = wrap.getBoundingClientRect();
        return (x - r.left) < r.width / 2;
      };

      on(wrap, "touchstart", (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        startTime = v.currentTime;
        startVolume = v.volume;
        startBrightness = 100;
        gestureMode = null;

        // double tap
        const now = Date.now();
        if (now - lastTap < 300 && Math.abs(t.clientX - lastTapX) < 40) {
          const r = wrap.getBoundingClientRect();
          const mid = r.left + r.width / 2;
          if (t.clientX < mid) {
            v.currentTime = Math.max(0, v.currentTime - 10);
            showInd("◀◀", "10-");
          } else {
            v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
            showInd("▶▶", "10+");
          }
          setTimeout(hideInd, 500);
          lastTap = 0;
          return;
        }
        lastTap = now;
        lastTapX = t.clientX;
      }, { passive: true });

      on(wrap, "touchmove", (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (!gestureMode) {
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 15) gestureMode = "seek";
          else if (Math.abs(dy) > 15) {
            gestureMode = isLeftZone(startX) ? "brightness" : "volume";
          }
        }

        if (gestureMode === "seek") {
          const r = wrap.getBoundingClientRect();
          const pct = dx / r.width;
          const target = clamp(startTime + pct * (v.duration || 0), 0, v.duration || 0);
          showInd("◀▶", formatTime(target));
        } else if (gestureMode === "volume") {
          const delta = -dy / 200;
          v.volume = clamp(startVolume + delta, 0, 1);
          v.muted = false;
          showInd("🔊", Math.round(v.volume * 100) + "%");
        } else if (gestureMode === "brightness") {
          const delta = -dy / 200;
          const val = clamp(startBrightness + delta * 100, 20, 200);
          this.dom.videoPlayer.style.filter =
            "brightness(" + val + "%) " + (this.dom.videoPlayer.style.filter.replace(/brightness\([^)]*\)\s*/, "") || "");
          showInd("☀", Math.round(val) + "%");
        }
      }, { passive: true });

      on(wrap, "touchend", () => {
        if (gestureMode === "seek") {
          const r = wrap.getBoundingClientRect();
          const pct = (this._lastTouchX || startX - startX) / r.width;
        }
        gestureMode = null;
        setTimeout(hideInd, 400);
      });
    },

    /* =================================================
       کانتکست منو
       ================================================= */
    openContextMenu(x, y, index, isPhoto) {
      const menu = this.dom.contextMenu;
      menu.classList.remove("hidden");
      menu.style.left = Math.min(x, window.innerWidth - 200) + "px";
      menu.style.top = Math.min(y, window.innerHeight - 180) + "px";
      requestAnimationFrame(() => menu.classList.add("show"));
      this._ctxTarget = { index: index, isPhoto: !!isPhoto };
    },

    closeContextMenu() {
      this.dom.contextMenu.classList.remove("show");
      setTimeout(() => this.dom.contextMenu.classList.add("hidden"), 180);
    },

    bindContextMenu() {
      $$(".ctx-item", this.dom.contextMenu).forEach((b) => {
        on(b, "click", () => {
          const action = b.dataset.ctx;
          const t = this._ctxTarget || {};
          if (t.isPhoto) {
            const item = this._contextPhoto;
            if (!item) return;
            if (action === "open-photo") this.openPhotoByItem(item);
            if (action === "remove" || action === "delete") {
              const i = this.gallery.indexOf(item);
              if (i >= 0) {
                URL.revokeObjectURL(item.url);
                this.gallery.splice(i, 1);
                this.renderGallery();
              }
            }
          } else if (typeof t.index === "number" && t.index >= 0) {
            const item = this.playlist[t.index];
            if (!item) return;
            if (action === "play") this.playIndex(t.index);
            if (action === "open-photo") this.openPhotoByItem(item);
            if (action === "remove") {
              URL.revokeObjectURL(item.url);
              this.playlist.splice(t.index, 1);
              if (this.currentIndex === t.index) {
                this.currentIndex = -1;
                this.dom.videoPlayer.removeAttribute("src");
                this.dom.videoPlayer.load();
                this.updatePlayerUI();
              }
              this.renderPlaylist();
            }
            if (action === "delete") {
              URL.revokeObjectURL(item.url);
              this.playlist.splice(t.index, 1);
              if (this.currentIndex === t.index) {
                this.currentIndex = -1;
                this.dom.videoPlayer.removeAttribute("src");
                this.dom.videoPlayer.load();
                this.updatePlayerUI();
              }
              this.renderPlaylist();
              toast("حذف شد", "info");
            }
          }
          this.closeContextMenu();
        });
      });
    },

    bindContextMenuGlobal() {
      on(document, "click", (e) => {
        if (!e.target.closest("#contextMenu")) this.closeContextMenu();
      });
      on(document, "scroll", () => this.closeContextMenu(), true);
    },

    /* =================================================
       helpers
       ================================================= */
    revokeAll() {
      this.playlist.forEach((p) => { try { URL.revokeObjectURL(p.url); } catch (e) {} });
      this.gallery.forEach((g) => { try { URL.revokeObjectURL(g.url); } catch (e) {} });
    },

    updatePlayerUI() {
      const v = this.dom.videoPlayer;
      const hasVideo = !!v.src;
      if (this.dom.videoTitle) this.dom.videoTitle.textContent = hasVideo
        ? (this.playlist[this.currentIndex] || {}).name || ""
        : "هیچ ویدیویی پخش نمی‌شه";
      if (this.dom.videoMeta) this.dom.videoMeta.textContent = hasVideo
        ? formatBytes((this.playlist[this.currentIndex] || {}).size || 0)
        : "";
      this.updateTimeDisplay();
      this.renderBookmarksOnTimeline();
    }

  };

  /* =====================================================
     راه‌اندازی
     ===================================================== */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.init());
  } else {
    App.init();
  }

  window.LiquidPlay = App;

})();
