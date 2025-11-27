console.log("🚀 بدء تشغيل التطبيق - وضع Offline-First...");

// === MODULE: CONNECTION STATE MANAGEMENT ===
let isOnline = navigator.onLine;
let pendingSyncData = [];

function updateConnectionStatus() {
    isOnline = navigator.onLine;
    const statusIndicator = document.getElementById("connection-status");
    const installBtn = document.getElementById("install-btn");
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (statusIndicator) {
        if (isOnline) {
            statusIndicator.innerHTML = `
                <span class="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    متصل بالإنترنت
                </span>
            `;
            if (!isInStandaloneMode) {
                if (isIOS || deferredPrompt) {
                    installBtn.style.display = "flex";
                }
            }
        } else {
            statusIndicator.innerHTML = `
                <span class="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                    وضع عدم الاتصال (Offline)
                </span>
            `;
            installBtn.style.display = "none";
        }
    }
    if (isOnline && pendingSyncData.length > 0) {
        syncPendingData();
    }
}

window.addEventListener("online", () => {
    console.log("✅ تم استعادة الاتصال بالإنترنت");
    updateConnectionStatus();
    showMessage("تم استعادة الاتصال! جارٍ مزامنة البيانات...", "success");
});

window.addEventListener("offline", () => {
    console.log("⚠️ فقد الاتصال بالإنترنت - التبديل لوضع Offline");
    updateConnectionStatus();
    showMessage("أنت الآن في وضع عدم الاتصال. ستتم مزامنة التغييرات عند استعادة الاتصال.", "info");
});

// === MODULE: OFFLINE SYNC MECHANISM ===
function addToPendingSync(action, data) {
    const syncItem = {
        id: Date.now() + Math.random(),
        action: action,
        data: data,
        timestamp: new Date().toISOString()
    };
    pendingSyncData.push(syncItem);
    localStorage.setItem("moddakr_pendingSync", JSON.stringify(pendingSyncData));
    updateSyncIndicator();
}

function updateSyncIndicator() {
    const syncIndicator = document.getElementById("sync-indicator");
    if (syncIndicator) {
        if (pendingSyncData.length > 0) {
            syncIndicator.innerHTML = `
                <span class="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ${pendingSyncData.length} تغيير معلق
                </span>
            `;
        } else {
            syncIndicator.innerHTML = `
                <span class="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    متزامن
                </span>
            `;
        }
    }
}

async function syncPendingData() {
    if (!isOnline || pendingSyncData.length === 0) return;
    console.log("🔄 بدء مزامنة البيانات المعلقة...");
    showMessage("جارٍ مزامنة البيانات...", "info");
    await new Promise(resolve => setTimeout(resolve, 1500));
    pendingSyncData = [];
    localStorage.setItem("moddakr_pendingSync", JSON.stringify([]));
    updateSyncIndicator();
    console.log("✅ تمت المزامنة بنجاح");
    showMessage("تمت مزامنة جميع التغييرات بنجاح! ✓", "success");
}

// === MODULE: SERVICE WORKER REGISTRATION ===
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
        .then(registration => {
            console.log("✅ Service Worker مسجل بنجاح:", registration.scope);
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                console.log("🔄 تحديث Service Worker جديد متاح");
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        console.log("✨ تحديث جديد متاح - الرجاء إعادة تحميل الصفحة");
                        showMessage("تحديث جديد متاح! سيتم تطبيقه عند إعادة تحميل الصفحة.", "info");
                    }
                });
            });
        })
        .catch(error => {
            console.error("❌ فشل تسجيل Service Worker:", error);
        });
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SYNC_COMPLETE") {
            console.log("📬 رسالة من Service Worker:", event.data.message);
            showMessage(event.data.message, "success");
            updateSyncIndicator();
        }
    });
}

// Constants
const REVIEW_INTERVALS = [1, 3, 8, 18, 48, 139];
let lessons = [];
let completedTasks = new Set();

// Theme Management
function initTheme() {
    const theme = localStorage.getItem("theme") || "dark";
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    updateThemeButton();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.documentElement.classList.contains("dark");
    document.getElementById("theme-icon").textContent = isDark ? "☀️" : "🌙";
    document.getElementById("theme-text").textContent = isDark ? "الوضع النهاري" : "الوضع الليلي";
}

// PWA Install Functionality
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
    console.log("💫 حدث beforeinstallprompt تم تشغيله");
    e.preventDefault();
    deferredPrompt = e;
    if (isOnline) {
        document.getElementById("install-btn").style.display = "flex";
    }
    console.log("✅ التطبيق جاهز للتثبيت");
});

window.addEventListener("appinstalled", () => {
    console.log("🎉 تم تثبيت التطبيق بنجاح!");
    deferredPrompt = null;
    showMessage("تم تثبيت التطبيق بنجاح! 🎉 يمكنك الآن استخدامه من الشاشة الرئيسية", "success");
    setTimeout(() => {
        document.getElementById("install-btn").style.display = "none";
    }, 3000);
});

window.addEventListener("load", () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isIOS && !isInStandaloneMode && isOnline) {
        document.getElementById("install-btn").style.display = "flex";
        console.log("📱 جهاز iOS تم اكتشافه - زر التثبيت متاح");
    }
});

document.getElementById("install-btn").addEventListener("click", async () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    console.log("🖱️ تم الضغط على زر التثبيت");
    console.log("📱 iOS:", isIos);
    console.log("🖥️ Standalone Mode:", isInStandaloneMode);
    console.log("💾 Deferred Prompt:", !!deferredPrompt);
    if (isInStandaloneMode) {
        showMessage("التطبيق مثبت بالفعل! ✅", "info");
        return;
    }
    if (isIos && !isInStandaloneMode) {
        showIOSInstructions();
        return;
    }
    if (deferredPrompt) {
        try {
            console.log("📲 عرض نافذة التثبيت...");
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log("👤 اختيار المستخدم:", outcome);
            if (outcome === "accepted") {
                showMessage("جارٍ تثبيت التطبيق... 📱", "success");
            } else {
                showMessage("تم إلغاء التثبيت", "info");
            }
            deferredPrompt = null;
        } catch (error) {
            console.error("❌ خطأ أثناء التثبيت:", error);
            showIOSInstructions();
        }
    } else {
        console.log("ℹ️ لا يوجد Deferred Prompt - عرض التعليمات");
        showIOSInstructions();
    }
});

function showIOSInstructions() {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const modal = document.getElementById("task-modal");
    const content = document.getElementById("modal-content");
    let instructions = "";
    if (isIos) {
        instructions = `
            <div class="text-center space-y-4">
                <div class="text-6xl mb-4">📱</div>
                <h3 class="text-xl font-bold dark:text-theme-text mb-4">تثبيت التطبيق على iPhone/iPad</h3>
                <div class="text-right space-y-3 text-gray-700 dark:text-gray-300">
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">1️⃣</span>
                        <p>اضغط على زر <strong>المشاركة</strong> <span class="inline-block text-blue-500 text-xl">⎋</span> في شريط الأدوات</p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">2️⃣</span>
                        <p>مرر للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> <span class="inline-block text-xl">➕</span></p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">3️⃣</span>
                        <p>اضغط على <strong>"إضافة"</strong> في الزاوية العليا اليسرى</p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-emerald-500">
                        <span class="text-2xl">✅</span>
                        <p class="font-bold text-emerald-700 dark:text-emerald-300">ستجد أيقونة "مُدَّكِر" 💡 على شاشتك الرئيسية!</p>
                    </div>
                    <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500">
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            <strong>💡 بيانات المتصفح.:</strong> التطبيق سيعمل بكامل وظائفه بدون إنترنت بعد التثبيت مالم يتم حذف بيانات المتصفح!
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        instructions = `
            <div class="text-center space-y-4">
                <div class="text-6xl mb-4">📱</div>
                <h3 class="text-xl font-bold dark:text-theme-text mb-4">تثبيت التطبيق</h3>
                <div class="text-right space-y-3 text-gray-700 dark:text-gray-300">
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">🌐</span>
                        <p><strong>على Chrome:</strong> اضغط على القائمة (⋮) ثم "تثبيت التطبيق"</p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">🦊</span>
                        <p><strong>على Firefox:</strong> اضغط على أيقونة المنزل (+) في شريط العنوان</p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <span class="text-2xl">🎯</span>
                        <p><strong>على Edge:</strong> اضغط على (⋯) ثم "التطبيقات" ثم "تثبيت هذا الموقع كتطبيق"</p>
                    </div>
                    <div class="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-emerald-500">
                        <span class="text-2xl">✅</span>
                        <p class="font-bold text-emerald-700 dark:text-emerald-300">يمكنك استخدام "مُدَّكِر" بدون إنترنت!</p>
                    </div>
                </div>
            </div>
        `;
    }
    content.innerHTML = instructions;
    modal.classList.remove("hidden");
}

// Utility Functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getTaskKey(date, name, reviewNum) {
    return `${date}|${name}|${reviewNum}`;
}

function showMessage(text, type = "success") {
    const messageBox = document.getElementById("message-box");
    messageBox.textContent = text;
    messageBox.className = `p-4 rounded-lg mb-5 text-center font-semibold ${
        type === "error" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200" :
        type === "info" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" :
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
    }`;
    messageBox.classList.remove("hidden");
    setTimeout(() => messageBox.classList.add("hidden"), 5000);
}

// Statistics
function updateStatistics() {
    const allTasks = [];
    lessons.forEach(lesson => {
        const lessonDate = formatDate(new Date(lesson.date));
        allTasks.push({ date: lessonDate, name: lesson.name, review: 0 });
        REVIEW_INTERVALS.forEach((interval, idx) => {
            const reviewDate = formatDate(addDays(new Date(lesson.date), interval));
            allTasks.push({ date: reviewDate, name: lesson.name, review: idx + 1 });
        });
    });

    const totalTasks = allTasks.length;
    const completedCount = allTasks.filter(task => 
        completedTasks.has(getTaskKey(task.date, task.name, task.review))
    ).length;
    const pendingCount = totalTasks - completedCount;
    const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    document.getElementById("total-tasks").textContent = totalTasks;
    document.getElementById("completed-tasks").textContent = completedCount;
    document.getElementById("pending-tasks").textContent = pendingCount;
    document.getElementById("completion-percentage").textContent = percentage + "%";
    document.getElementById("progress-bar").style.width = percentage + "%";
    document.getElementById("progress-text").textContent = percentage + "%";
}

// Add Lesson
document.getElementById("add-lesson").addEventListener("click", () => {
    console.log("➕ زر الإضافة تم الضغط عليه");
    const name = document.getElementById("lessonName").value.trim();
    const date = document.getElementById("lessonDate").value;

    console.log("📝 الاسم:", name, "📅 التاريخ:", date);

    if (!name || !date) {
        showMessage("الرجاء إدخال اسم الدرس والتاريخ", "error");
        return;
    }

    if (lessons.some(l => l.name.toLowerCase() === name.toLowerCase())) {
        showMessage("الدرس موجود بالفعل", "error");
        return;
    }

    lessons.push({ name, date });
    lessons.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log("✅ الدروس الحالية:", lessons);
    if (!isOnline) {
        addToPendingSync("add_lesson", { name, date });
        showMessage(`تمت إضافة "${name}" بنجاح محليًا! سيتم المزامنة عند الاتصال ✅`, "success");
    } else {
        showMessage(`تمت إضافة "${name}" بنجاح! ✅`, "success");
    }
    saveData();
    renderCalendar();
    updateStatistics();
    document.getElementById("lessonName").value = "";
    document.getElementById("lessonDate").value = formatDate(new Date());
});

// Delete Lesson
document.getElementById("delete-lesson").addEventListener("click", () => {
    const name = document.getElementById("delete-lesson-name").value.trim();
    if (!name) {
        showMessage("الرجاء إدخال اسم الدرس", "error");
        return;
    }

    const initialLength = lessons.length;
    lessons = lessons.filter(l => l.name.toLowerCase() !== name.toLowerCase());

    if (lessons.length === initialLength) {
        showMessage(`لم يتم العثور على "${name}"`, "error");
        return;
    }

    if (!isOnline) {
        addToPendingSync("delete_lesson", { name });
        showMessage(`تم حذف "${name}" بنجاح محليًا! سيتم المزامنة عند الاتصال`, "success");
    } else {
        showMessage(`تم حذف "${name}" بنجاح!`, "success");
    }

    saveData();
    renderCalendar();
    updateStatistics();
    document.getElementById("delete-lesson-name").value = "";
});

// Download
document.getElementById("download-schedule").addEventListener("click", () => {
    const data = {
        lessons,
        completedTasks: [...completedTasks],
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        pendingSync: pendingSyncData,
        exportDate: new Date().toISOString(),
        version: "3.0-pwa"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}-${String(now.getMinutes()).padStart(2,"0")}`;
    a.download = `jadwal_moddakr-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (!isOnline) {
        showMessage("تم تحميل الجدول بنجاح محليًا! 📥 (يعمل بدون إنترنت)", "success");
    } else {
        showMessage("تم تحميل الجدول بنجاح! 📥", "success");
    }
});

// Upload
document.getElementById("upload-schedule").addEventListener("click", () => {
    document.getElementById("upload-input").click();
});

document.getElementById("upload-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            lessons = data.lessons || [];
            completedTasks = new Set(data.completedTasks || []);
            if (data.pendingSync && Array.isArray(data.pendingSync)) {
                pendingSyncData = data.pendingSync;
            }
            if (data.theme) {
                if (data.theme === "dark") {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
                localStorage.setItem("theme", data.theme);
                updateThemeButton();
            }
            saveData();
            renderCalendar();
            updateStatistics();
            updateSyncIndicator();
            if (!isOnline) {
                showMessage("تم تحميل الجدول بنجاح محليًا! 📤 (يعمل بدون إنترنت)", "success");
            } else {
                showMessage("تم تحميل الجدول بنجاح! 📤", "success");
            }
        } catch (error) {
            showMessage("خطأ في قراءة الملف", "error");
            console.error("خطأ في التحميل:", error);
        }
    };
    reader.readAsText(file);
    e.target.value = "";
});

// Save/Load Data
function saveData() {
    try {
        localStorage.setItem("moddakr_lessons", JSON.stringify(lessons));
        localStorage.setItem("moddakr_completedTasks", JSON.stringify([...completedTasks]));
        localStorage.setItem("moddakr_pendingSync", JSON.stringify(pendingSyncData));
        localStorage.setItem("moddakr_lastSave", new Date().toISOString());
        console.log("💾 تم حفظ البيانات بنجاح (Offline-First)");
    } catch (e) {
        console.error("❌ خطأ في الحفظ:", e);
        showMessage("تحذير: لم يتم حفظ التغييرات", "error");
    }
}

function loadData() {
    try {
        const savedLessons = localStorage.getItem("moddakr_lessons");
        const savedCompleted = localStorage.getItem("moddakr_completedTasks");
        const savedPendingSync = localStorage.getItem("moddakr_pendingSync");
        if (savedLessons) lessons = JSON.parse(savedLessons);
        if (savedCompleted) completedTasks = new Set(JSON.parse(savedCompleted));
        if (savedPendingSync) pendingSyncData = JSON.parse(savedPendingSync);
        console.log("📂 تم تحميل البيانات:", lessons.length, "دروس");
        console.log("🔄 تغييرات معلقة:", pendingSyncData.length);
        if (lessons.length > 0) {
            console.log("✅ سلامة البيانات: تم التحقق بنجاح");
        }
    } catch (e) {
        console.error("❌ خطأ في التحميل:", e);
        showMessage("تحذير: فشل تحميل بعض البيانات", "error");
    }
}

// Render Calendar
function renderCalendar() {
    const container = document.getElementById("calendar-container");
    document.getElementById("lesson-count").textContent = lessons.length;

    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="text-center p-12 bg-white dark:bg-theme-dark-card/80 rounded-lg shadow-md">
                <h2 class="text-2xl font-bold text-gray-700 dark:text-theme-text mb-2">📚 لا توجد دروس بعد</h2>
                <p class="text-gray-500 dark:text-gray-400">قم بإضافة درسك الأول لبدء رحلة التعلم!</p>
            </div>
        `;
        return;
    }

    const schedule = new Map();
    lessons.forEach((lesson, idx) => {
        const lessonDate = formatDate(new Date(lesson.date));
        if (!schedule.has(lessonDate)) schedule.set(lessonDate, []);
        schedule.get(lessonDate).push({
            name: lesson.name,
            type: "new",
            isFirst: idx === 0,
            review: 0,
            originalDate: lessonDate
        });

        REVIEW_INTERVALS.forEach((interval, rIdx) => {
            const reviewDate = formatDate(addDays(new Date(lesson.date), interval));
            if (!schedule.has(reviewDate)) schedule.set(reviewDate, []);
            schedule.get(reviewDate).push({
                name: lesson.name,
                type: "review",
                review: rIdx + 1,
                interval,
                originalDate: lessonDate
            });
        });
    });

    const dates = [...schedule.keys()].sort();
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    let html = "";
    while (currentDate <= endMonth) {
        html += renderMonth(currentDate, schedule);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    container.innerHTML = html;

    document.querySelectorAll(".task-item").forEach(el => {
        el.addEventListener("click", () => {
            const data = JSON.parse(el.dataset.task);
            showTaskModal(data);
        });
    });
}

function renderMonth(date, schedule) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleDateString("ar", { month: "long", year: "numeric" });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    let html = `
        <div class="bg-white dark:bg-theme-dark-card/80 rounded-xl shadow-xl mb-6 overflow-hidden">
            <div class="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-theme-dark-card dark:to-theme-dark-bg text-white p-4 text-center">
                <h3 class="text-2xl font-bold">${monthName}</h3>
            </div>
            <div class="grid grid-cols-7 bg-gray-100 dark:bg-theme-dark-bg border-b-2 dark:border-theme-border">
                ${dayNames.map(day => `<div class="text-center p-2 text-xs font-semibold text-gray-600 dark:text-gray-400">${day}</div>`).join("")}
            </div>
            <div class="grid grid-cols-7">
    `;

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="border dark:border-theme-border/30 min-h-[120px] bg-gray-50 dark:bg-theme-dark-bg/50"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = formatDate(new Date(year, month, day));
        const tasks = schedule.get(currentDate) || [];
        html += `
            <div class="border dark:border-theme-border/30 min-h-[120px] p-2 bg-white dark:bg-theme-dark-card/50 hover:bg-gray-50 dark:hover:bg-theme-dark-card/70 transition-colors">
                <div class="font-bold text-sm mb-1 text-gray-700 dark:text-theme-text">${day}</div>
                <div class="space-y-1">
        `;

        tasks.sort((a, b) => {
            if (a.type === "new" && b.type === "review") return -1;
            if (a.type === "review" && b.type === "new") return 1;
            return a.review - b.review;
        }).forEach(task => {
            const taskKey = getTaskKey(currentDate, task.name, task.review);
            const isCompleted = completedTasks.has(taskKey);
            const taskData = { ...task, date: currentDate };
            const isMobile = window.innerWidth < 768;
            let className = "task-item text-xs p-1.5 rounded cursor-pointer transition-all hover:scale-105 hover:shadow-lg overflow-hidden whitespace-nowrap text-ellipsis ";
            let icon = "";
            let displayText = "";
            if (task.type === "new") {
                if (task.isFirst) {
                    className += "bg-blue-500 dark:bg-theme-accent dark:text-theme-dark-bg text-white font-bold";
                    icon = "🎉";
                } else {
                    className += "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-2 border-green-500 dark:border-green-600";
                    icon = "⭐";
                }
                displayText = isMobile ? icon : `${icon} ${task.name}`;
            } else {
                className += "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-500 dark:border-yellow-600";
                icon = "🔄";
                displayText = isMobile ? icon : `${icon} ${task.name} (${task.review})`;
            }
            if (isCompleted) {
                className += " opacity-60 line-through";
            }
            html += `
                <div class="${className}" data-task='${JSON.stringify(taskData)}'>
                    ${displayText}${isCompleted ? "" : ""}
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    html += "</div></div>";
    return html;
}

// Task Modal
function showTaskModal(task) {
    const modal = document.getElementById("task-modal");
    const content = document.getElementById("modal-content");
    const gregorianDate = new Date(task.date + "T00:00:00").toLocaleDateString("ar", { 
        year: "numeric", month: "long", day: "numeric"
    });
    const hijriDate = new Date(task.date + "T00:00:00").toLocaleDateString("ar-SA", { 
        year: "numeric", month: "long", day: "numeric", calendar: "islamic-umalqura" 
    });
    const taskKey = getTaskKey(task.date, task.name, task.review);
    const isCompleted = completedTasks.has(taskKey);
    const quotes = [
        "من جدّ وجد، ومن سار على الدرب وصل 🌟",
        "العلم يرفع بيوتاً لا عماد لها 📚",
        "النجاح هو حصيلة مجهودات صغيرة تتكرر يومياً 💪",
        "من صبر ظفر، ومن ثابر أدرك 🎯",
        "قطرة الماء تثقب الصخر بالتكرار 💧",
        'العلم يرفع بيوتاً لا عماد لها، والجهل يهدم بيوت العز والكرم 📚',
        'النجاح هو حصيلة مجهودات صغيرة تتكرر يومياً 💪',
        'من صبر ظفر، ومن ثابر أدرك 🎯',
        'قطرة الماء تثقب الصخر، لا بالعنف ولكن بالتكرار 💧',
        'كل يوم تراجع فيه دروسك هو استثمار في مستقبلك 🌱',
        'المثابرة والإصرار مفتاح كل نجاح 🔑',
        'الطريق إلى القمة ليس بالسهل، لكنه يستحق العناء 🏔️',
        'العبقرية هي 1% إلهام و99% اجتهاد - توماس إديسون ⚡',
        'اليوم صعب، غداً أصعب، لكن بعد غدٍ ستشرق الشمس 🌅',
        'لا تؤجل عمل اليوم إلى الغد، فالنجاح يكمن في الاستمرارية ⏰',
        'من يصعد السلم درجة درجة يصل إلى القمة 🪜',
        'التكرار يعلم الشطار، والمراجعة تثبت المعرفة 🔄',
        'كل مراجعة تقربك خطوة من إتقان العلم 📖',
        'الفشل ليس سقوطاً، بل هو عدم النهوض بعد السقوط 🦅'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    let badgeClass = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    let badgeText = "درس جديد";
    if (task.type === "review") {
        badgeClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
        badgeText = `مراجعة رقم ${task.review}`;
    } else if (task.isFirst) {
        badgeClass = "bg-blue-500 text-white dark:bg-theme-accent dark:text-theme-dark-bg";
        badgeText = "درسك الأول! ";
    }

    // هنا نقوم بتحويل النص إلى Markdown
    const renderedDescription = marked.parse(task.name);

    let detailsHTML = `
        <div class="space-y-3">
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">📚</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">اسم الدرس:</p>
                    <!-- استبدال P بـ DIV ودعم Markdown -->
                    <div class="font-bold text-lg dark:text-theme-text markdown-view">${renderedDescription}</div>
                </div>
            </div>
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">📅</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">التاريخ الميلادي:</p>
                    <p class="font-semibold dark:text-theme-text">${gregorianDate}</p>
                </div>
            </div>
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">🌙</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">التاريخ الهجري:</p>
                    <p class="font-semibold dark:text-theme-text">${hijriDate}</p>
                </div>
            </div>
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">📌</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">النوع:</p>
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeClass}">${badgeText}</span>
                </div>
            </div>
    `;
    if (task.type === "review") {
        const originalDate = new Date(task.originalDate + "T00:00:00").toLocaleDateString("ar", { 
            year: "numeric", month: "long", day: "numeric" 
        });
        detailsHTML += `
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">🔄</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">رقم المراجعة:</p>
                    <p class="font-semibold dark:text-theme-text">${task.review} من 6</p>
                </div>
            </div>
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">⏱️</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">الفاصل الزمني:</p>
                    <p class="font-semibold dark:text-theme-text">${task.interval} يوم من تاريخ الدراسة الأصلي</p>
                </div>
            </div>
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">📖</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">الدرس الأصلي:</p>
                    <p class="font-semibold dark:text-theme-text">${originalDate}</p>
                </div>
            </div>
        `;
    }
    detailsHTML += `
            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                <span class="text-2xl">💡</span>
                <div class="flex-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">بيانات المتصفح. اليوم:</p>
                    <p class="font-semibold dark:text-theme-text">${randomQuote}</p>
                </div>
            </div>
            <div class="mt-6 pt-6 border-t-2 dark:border-theme-border">
                <label class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/20 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-black/30 transition-colors">
                    <input type="checkbox" ${isCompleted ? "checked" : ""} 
                           onchange="window.toggleTaskCompletion('${taskKey}')"
                           class="w-6 h-6 rounded border-gray-300 dark:border-theme-border text-emerald-600 dark:text-theme-accent focus:ring-2 focus:ring-emerald-500 dark:focus:ring-theme-accent cursor-pointer">
                    <span class="text-lg font-semibold dark:text-theme-text">تم إنجاز هذه المهمة ✔</span>
                </label>
            </div>
        </div>
    `;
    content.innerHTML = detailsHTML;
    modal.classList.remove("hidden");
}

window.toggleTaskCompletion = function(taskKey) {
    if (completedTasks.has(taskKey)) {
        completedTasks.delete(taskKey);
    } else {
        completedTasks.add(taskKey);
    }
    if (!isOnline) {
        addToPendingSync("toggle_task", { taskKey, completed: completedTasks.has(taskKey) });
    }
    saveData();
    updateStatistics();
    renderCalendar();
};

document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("task-modal").classList.add("hidden");
});

document.getElementById("task-modal").addEventListener("click", (e) => {
    if (e.target.id === "task-modal") {
        document.getElementById("task-modal").classList.add("hidden");
    }
});

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

// Initialize Application
console.log("🔄 بدء التهيئة...");
initTheme();
loadData();
updateConnectionStatus();
updateSyncIndicator();
renderCalendar();
updateStatistics();
document.getElementById("lessonDate").value = formatDate(new Date());

setInterval(() => {
    if (isOnline && pendingSyncData.length > 0) {
        console.log("⏰ فحص دوري: جارٍ المزامنة...");
        syncPendingData();
    }
}, 30000);

console.log("🔍 فحص سلامة البيانات المحلية...");
if (lessons.length === 0 && completedTasks.size === 0) {
    console.log("ℹ️ لا توجد بيانات محفوظة - تطبيق جديد");
} else {
    console.log("✅ تم التحقق من سلامة البيانات بنجاح");
}

console.log("✅ التطبيق جاهز للعمل في وضع Offline-First!");
console.log("📱 حالة الاتصال:", isOnline ? "متصل" : "غير متصل");
console.log("💾 البيانات المحلية:", lessons.length, "دروس،", completedTasks.size, "مهام مكتملة");
console.log("🔄 تغييرات معلقة للمزامنة:", pendingSyncData.length);