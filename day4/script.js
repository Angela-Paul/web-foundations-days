const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

//Update both counters and the warning classes
function updateCounters() {
  const text = noteText.value;
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = chars + " / 200 characters";
  wordCount.textContent = words + " words";

  charCount.classList.toggle("warning", chars > 180);
  charCount.classList.toggle("over", chars > 200);
}

// Save the draft in localStorage
function saveDraft() {
  localStorage.setItem("draft", noteText.value);
}

//Empty the textarea, remove the draft the reset the counters
function clearAll() {
  noteText.value = "";
  localStorage.removeItem("draft");
  updateCounters();
}

// Switch the theme and update the button label
function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    themeToggle.textContent = isDark ? "Light mode" : " Dark mode";
}

//Every time the user types
noteText.addEventListener("input", function () {
  updateCounters();
  saveDraft();
});

//Escape key clears the textarea clears it
noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearAll();
    }
});

//Clear button
clearBtn.addEventListener("click", clearAll); 

//Theme toggle button
themeToggle.addEventListener("click", function () {
    const nowDark = !document.body.classList.contains("dark");
    const theme = nowDark ? "dark" : "light";
    applyTheme(theme);
    localStorage.setItem("theme", theme);
});

//When the page loads: restore the draft and the theme, then update the counters 
    const savedDraft = localStorage.getItem("draft");
    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

    applyTheme(localStorage.getItem("theme") || "light");
    updateCounts();
