import "./style.css";
const { log } = require("neo-async");

// Web Component: app-bar
class AppBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #007bff;
                    padding: 15px;
                    color: white;
                    text-align: center;
                    font-size: 1.5em;
                    font-weight: 600;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }
                div {
                    max-width: 1200px;
                    margin: 0 auto;
                }
            </style>
            <div>Notes App</div>
        `;
  }
}
customElements.define("app-bar", AppBar);

// Web Component: note-item
class NoteItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #ffffff;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 10px;
                    border: 1px solid #ddd;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    position: relative;
                }
                h2 {
                    font-size: 1.5em;
                    margin-bottom: 10px;
                    color: #007bff;
                    font-weight: 600;
                }
                p {
                    font-size: 1em;
                    color: #555;
                    overflow-wrap: break-word;
                }
                .date {
                    font-size: 0.85em;
                    color: #888;
                }
                .delete-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background-color: #ff4d4f;
                    border: none;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.85em;
                }
                .delete-btn:hover {
                    background-color: #ff1a1f;
                }
            </style>
            <h2></h2>
            <p></p>
            <span class="date"></span>
            <button class="delete-btn">Delete</button>
        `;
  }

  connectedCallback() {
    this.shadowRoot.querySelector("h2").textContent =
      this.getAttribute("title");
    this.shadowRoot.querySelector("p").textContent = this.getAttribute("body");
    this.shadowRoot.querySelector(".date").textContent = new Date(
      this.getAttribute("date")
    ).toLocaleDateString();

    // Event Listener for Delete Button
    this.shadowRoot
      .querySelector(".delete-btn")
      .addEventListener("click", () => {
        const noteId = this.getAttribute("note-id");
        // this.dispatchEvent(new CustomEvent('delete-note', {
        //     detail: { id: noteId },
        //     bubbles: true,
        //     composed: true
        // }));
        deleteNoteFromApi(noteId);
      });
  }
}
customElements.define("note-item", NoteItem);

// Web Component: note-form
class NoteForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
            <style>
                form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }
                input, textarea {
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    font-size: 1em;
                    background-color: #f0f2f5;
                }
                button {
                    padding: 15px;
                    border: none;
                    background-color: #007bff;
                    color: white;
                    border-radius: 8px;
                    font-size: 1em;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
            <form id="noteForm">
                <input type="text" id="title" placeholder="Note Title" required>
                <textarea id="body" placeholder="Note Body" rows="4" required></textarea>
                <button type="submit">Add Note</button>
            </form>
        `;
  }

  connectedCallback() {
    const form = this.shadowRoot.querySelector("#noteForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = this.shadowRoot.querySelector("#title").value;
      const body = this.shadowRoot.querySelector("#body").value;
      addNote(title, body);
      form.reset();
    });
  }
}
customElements.define("note-form", NoteForm);

// data dummy awal
const notesData = JSON.parse(localStorage.getItem("notesData")) || [];

// Fungsi untuk menyimpan data ke localStorage (hanya untuk data dummy)
function saveNotesToLocalStorage() {
  localStorage.setItem("notesData", JSON.stringify(notesData));
}

// Fungsi untuk menambahkan catatan baru
function addNote(title, body) {
  const newNote = {
    id: `notes-${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
    archived: false,
  };

  // Menambahkan catatan ke data dummy
  notesData.push(newNote);
  saveNotesToLocalStorage();

  // Tambahkan catatan ke API
  addNoteToApi(title, body)
    .then(() => {
      // Jika berhasil, tambahkan ke UI
      renderNotes();
    })
    .catch((error) => {
      console.error("Gagal menambahkan catatan ke API:", error);
    });

  // Render ulang setelah menambahkan data dummy
  renderNotes();
}

// Fungsi untuk merender catatan ke dalam DOM
async function renderNotes() {
  const notesContainer = document.getElementById("notes-container");
  notesContainer.innerHTML = ""; // Kosongkan container sebelum dirender ulang

  // pengurutan note berdasarkan tanggal
  // notesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sorting descending
  // notesData.forEach(note => {
  //     const noteElement = document.createElement('note-item');
  //     noteElement.setAttribute('note-id', note.id);
  //     noteElement.setAttribute('title', note.title);
  //     noteElement.setAttribute('body', note.body);
  //     noteElement.setAttribute('date', note.createdAt);
  //     notesContainer.appendChild(noteElement);
  // });

  // Ambil catatan dari API
  try {
    const notesFromApi = await fetchNotes(); // Dapatkan catatan dari API
    notesFromApi.forEach((note) => {
      const noteElement = document.createElement("note-item");
      noteElement.setAttribute("note-id", note.id);
      noteElement.setAttribute("title", note.title);
      noteElement.setAttribute("body", note.body);
      noteElement.setAttribute("date", note.createdAt);
      notesContainer.appendChild(noteElement);
    });
  } catch (error) {
    console.error("Gagal memuat catatan dari API:", error);
  }
}

// JavaScript untuk menangani penghapusan
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("delete-btn")) {
    const noteId = event.target.getAttribute("note-id");

    // Hapus dari API
    deleteNoteFromApi(noteId);
  }
});

// Fungsi untuk menampilkan indikator loading
function showLoading() {
  console.log("haloo");

  document.getElementById("loading").style.display = "block";
}

// Fungsi untuk menyembunyikan indikator loading
function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

// JavaScript untuk validasi formulir dan pengiriman
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("note-form form");
  const titleInput = document.getElementById("title");
  const bodyTextarea = document.getElementById("body");

  // Function untuk menunjukkan kesalahan validasi dengan SweetAlert2
  function showError(message) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: message,
      confirmButtonText: "OK",
    });
  }

  // Real-time validation
  if (titleInput && bodyTextarea) {
    titleInput.addEventListener("input", () => {
      if (titleInput.value.trim() === "") {
        titleInput.classList.add("error");
      } else {
        titleInput.classList.remove("error");
      }
    });

    bodyTextarea.addEventListener("input", () => {
      if (bodyTextarea.value.trim() === "") {
        bodyTextarea.classList.add("error");
      } else {
        bodyTextarea.classList.remove("error");
      }
    });
  }

  // Form submission validation
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevent form from submitting

      const title = titleInput.value.trim();
      const body = bodyTextarea.value.trim();

      if (title === "" || body === "") {
        if (title === "") {
          showError("Title is required!");
        }
        if (body === "") {
          showError("Body is required!");
        }
        return;
      }

      // Create a new note item element
      const noteItem = document.createElement("note-item");
      noteElement.setAttribute("note-id", note.id);
      noteItem.setAttribute("title", title);
      noteItem.setAttribute("body", body);
      noteItem.setAttribute("date", new Date().toLocaleDateString());

      // Add the note item to the notes container
      const notesContainer = document.getElementById("notes-container");
      if (notesContainer) {
        notesContainer.appendChild(noteItem);
      }

      // Reset the form
      form.reset();
      Swal.fire("Success!", "Note added successfully!", "success");
    });
  }

  // Handle delete button clicks within note items
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-btn")) {
      event.target.closest("note-item").remove();
    }
  });
});

// URL API
const API_URL = "https://notes-api.dicoding.dev/v2/notes";

// Fungsi untuk menambahkan catatan baru ke API
async function addNoteToApi(title, body) {
  try {
    const response = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        title: title,
        body: body,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal menambahkan catatan.");
    }

    console.log("masuk");

    console.log("Catatan berhasil ditambahkan:", result);
    return result;
  } catch (error) {
    console.error("Error saat menambahkan catatan:", error);
    throw error;
  }
}

// Perbarui fungsi fetchNotes dengan indikator loading
async function fetchNotes() {
  showLoading();
  try {
    const response = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil daftar catatan");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  } finally {
    hideLoading();
  }
}

// Perbarui fungsi deleteNoteFromApi dengan indikator loading
async function deleteNoteFromApi(noteId) {
  showLoading();
  try {
    const response = await fetch(`${API_URL}/${noteId}`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal menghapus catatan.");
    }

    console.log("Catatan berhasil dihapus:", result);
    // notesData = notesData.filter(note => note.id !== noteId);
    // saveNotesToLocalStorage();
    renderNotes();
  } catch (error) {
    console.error("Error saat menghapus catatan:", error);
    throw error;
  } finally {
    hideLoading();
  }
}

// Render catatan saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  renderNotes();
});

// Render catatan awal
// renderNotes();
