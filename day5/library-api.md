# Library API Design

This is a REST API design for a library's `books` resource. Each endpoint uses the HTTP method to say what to do and the URL to say what to do it to.

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/17`
- **Description:** Returns the single book with id 17.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:** `{ "title": "Weep Not, Child", "author": "Ngugi wa Thiong'o", "year": 1964 }`
- **Success status:** 201 Created

### 4. Update a book
- **Method:** PATCH
- **Path:** `/books/17`
- **Description:** Changes only the fields that are sent, leaving the rest of book 17 as it was.
- **Example request body:** `{ "year": 1965 }`
- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/17`
- **Description:** Removes book 17 from the library.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author
- **Method:** GET
- **Path:** `/books?author=Grace%20Ogot`
- **Description:** Returns only the books written by the author given in the query parameter.
- **Request body:** none
- **Success status:** 200 OK

## Error codes

- **400 Bad Request**
  - Meaning: the request was invalid.
  - Example: a `POST /books` where the body has no `title`, or the `year` is a word instead of a number.
- **404 Not Found**
  - Meaning: the item or URL does not exist.
  - Example: `GET /books/9999` when no book has id 9999.