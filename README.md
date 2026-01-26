# Bootcamp Platform API

## Overview
This is the backend API for the Bootcamp Platform (MVP). It provides endpoints for authentication, user management, bootcamp batches, enrollment, and course materials.

**Base URL**: `http://localhost:3000`

## Authentication
- **Mechanism**: JWT (JSON Web Token)
- **Header**: `Authorization: Bearer <token>`
- **Roles**: `USER`, `ADMIN`

---

## Endpoints

### 1. Auth

#### Register User
Create a new user account.

- **Method**: `POST`
- **Path**: `/auth/register`
- **Auth**: Public
- **Body** (JSON):
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone_number": "081234567890"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "USER"
      },
      "token": "ey..."
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation error
  - `409 Conflict`: Email already exists

#### Login
Authenticate and receive a token.

- **Method**: `POST`
- **Path**: `/auth/login`
- **Auth**: Public
- **Body** (JSON):
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "message": "Login successful",
    "data": {
      "user": { "id": 1, "email": "john@example.com", "role": "USER" },
      "token": "ey..."
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials

---

### 2. User

#### Get Current Profile
Get details of the currently logged-in user.

- **Method**: `GET`
- **Path**: `/user/me`
- **Auth**: Required (`USER` or `ADMIN`)
- **Success Response** (200 OK):
  ```json
  {
    "data": {
      "id": 1,
      "email": "john@example.com",
      "role": "USER"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid or missing token

---

### 3. Batch

#### List Batches
Get a list of all available bootcamp batches.

- **Method**: `GET`
- **Path**: `/batch`
- **Auth**: Public
- **Success Response** (200 OK):
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Fullstack Batch 1",
        "start_date": "2026-02-10T00:00:00.000Z",
        "price": "5000000",
        "status": "OPEN"
      }
    ]
  }
  ```

#### Create Batch
Create a new batch.

- **Method**: `POST`
- **Path**: `/batch`
- **Auth**: `ADMIN`
- **Body** (JSON):
  ```json
  {
    "title": "Fullstack Batch 1",
    "start_date": "2026-02-10T00:00:00Z",
    "end_date": "2026-03-10T00:00:00Z",
    "price": 5000000,
    "status": "OPEN"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "message": "Batch created successfully",
    "data": { "id": 1, "title": "Fullstack Batch 1", ... }
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Insufficient permissions

#### Update Batch
Update details of an existing batch.

- **Method**: `PUT`
- **Path**: `/batch/:id`
- **Auth**: `ADMIN`
- **Body** (JSON):
  ```json
  {
    "title": "Fullstack Batch 1 (Revised)",
    "status": "CLOSED"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "message": "Batch updated successfully",
    "data": { ... }
  }
  ```

---

### 4. Enrollment

#### Enroll in Batch
Enroll the current user into a specific batch.

- **Method**: `POST`
- **Path**: `/enrollment`
- **Auth**: `USER`
- **Body** (JSON):
  ```json
  {
    "batch_id": 1
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "message": "Enrolled successfully",
    "data": {
      "id": 1,
      "user_id": 1,
      "batch_id": 1,
      "enrolled_at": "..."
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Batch not open
  - `409 Conflict`: Already enrolled

#### Get My Enrollments
List batches the current user is enrolled in.

- **Method**: `GET`
- **Path**: `/enrollment/my-enrollments`
- **Auth**: `USER`
- **Success Response** (200 OK):
  ```json
  {
    "data": [
      {
        "id": 1,
        "batch": { "title": "Fullstack Batch 1", ... }
      }
    ]
  }
  ```

---

### 5. Material

#### List Materials
Get materials for a specific batch (must be enrolled).

- **Method**: `GET`
- **Path**: `/material/batch/:batchId`
- **Auth**: `USER` (Enrolled) or `ADMIN`
- **Success Response** (200 OK):
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Intro to HTML",
        "content": "Markdown content...",
        "order": 1
      }
    ]
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Not enrolled

#### Create Material
Add a new learning material to a batch.

- **Method**: `POST`
- **Path**: `/material`
- **Auth**: `ADMIN`
- **Body** (JSON):
  ```json
  {
    "title": "Intro to HTML",
    "content": "# Hello World",
    "batch_id": 1,
    "order": 1
  }
  ```
- **Success Response** (201 Created)

#### Update Material
Edit an existing material.

- **Method**: `PUT`
- **Path**: `/material/:id`
- **Auth**: `ADMIN`
- **Body** (JSON):
  ```json
  {
    "title": "Intro to HTML 5"
  }
  ```
- **Success Response** (200 OK)
