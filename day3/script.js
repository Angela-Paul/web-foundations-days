let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const allowedCategories = ["personal", "work", "study"];

// 1. Notes whose text contains the word (upper/lower case ignored)
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter(function (note) {
    return note.text.toLowerCase().includes(search);
  });
}

// 2. The note with the most characters, or null if there are no notes
function longestNote(list = notes) {
  if (list.length === 0) {
    return null;
  }
  let longest = list[0];
  for (const note of list) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 3. Count of notes per category
function countByCategory(list = notes) {
  const counts = {};
  for (const note of list) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// 4. A sentence summarising the notes
function getSummary(list = notes) {
  const counts = countByCategory(list);
  const personal = counts.personal || 0;
  const work = counts.work || 0;
  const study = counts.study || 0;
  const word = list.length === 1 ? "note" : "notes";
  return `${list.length} ${word}: ${personal} personal, ${work} work, ${study} study.`;
}

// 5. True if a note with the same text already exists
function isDuplicate(text) {
  const clean = text.trim().toLowerCase();
  return notes.some(function (note) {
    return note.text.trim().toLowerCase() === clean;
  });
}

// 6. Add a note only if it passes all the checks
function addNote(text, category) {
  const clean = text.trim();

  if (clean.length < 1 || clean.length > 200) {
    console.log("Not added: note must be 1 to 200 characters.");
    return false;
  }
  if (isDuplicate(clean)) {
    console.log("Not added: this note already exists.");
    return false;
  }
  if (!allowedCategories.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: newId, text: clean, category: category });
  console.log("Added: " + clean);
  return true;
}

// ---------- TESTS ----------

// searchNotes
console.log(searchNotes("MILK"));
// [ { id: 1, text: 'Buy milk and bread', category: 'personal' } ]
console.log(searchNotes("xyz"));
// []

// longestNote
console.log(longestNote());
// { id: 3, text: 'Email the project report to Grace', category: 'work' }
console.log(longestNote([]));
// null

// countByCategory
console.log(countByCategory());
// { personal: 2, study: 2, work: 1 }
console.log(countByCategory([]));
// {}

// getSummary
console.log(getSummary());
// 5 notes: 2 personal, 1 work, 2 study.
console.log(getSummary([notes[0]]));
// 1 note: 1 personal, 0 work, 0 study.

// isDuplicate
console.log(isDuplicate("  buy MILK and bread  "));
// true
console.log(isDuplicate("Water the plants"));
// false

// addNote
console.log(addNote("Pay school fees", "personal"));
// Added: Pay school fees
// true
console.log(addNote("", "work"));
// Not added: note must be 1 to 200 characters.
// false
console.log(addNote("Call mum", "personal"));
// Not added: this note already exists.
// false
console.log(addNote("Gym session", "hobby"));
// Not added: category must be personal, work or study.
// false
console.log(getSummary());
// 6 notes: 3 personal, 1 work, 2 study.