![Gladia n8n Custom Nodes](https://mintcdn.com/gladia-95/d3oqVq8GCojBkeW7/assets/dark-banner.png?fit=max&auto=format&n=d3oqVq8GCojBkeW7&q=85&s=fcfb8697c847a9467d0a6853086b0bb4)

# Gladia n8n Custom Nodes

This repository contains **custom n8n nodes built by Gladia** to integrate Gladia’s APIs and internal tools directly into [n8n](https://n8n.io).  
These nodes let you automate workflows that use Gladia’s services — such as transcription, embeddings, and audio intelligence — seamlessly inside n8n.

To use these nodes, you’ll need a **Gladia API key**. You can generate one for free by creating an account at [app.gladia.io](https://app.gladia.io).  

Once logged in, go to your dashboard and copy your personal API key — you’ll need to add it in n8n when configuring any Gladia node.


For more information about Gladia’s APIs, visit the [official documentation](https://docs.gladia.io).

---

## Local Installation

To use the **Gladia n8n custom nodes** locally, follow these steps:

1. **Make sure n8n is installed globally**
   ```bash
   npm install -g n8n
   ```

2. **Navigate to n8n’s local nodes directory**
    ```bash
    cd ~/.n8n/nodes
    ```

3. **Install the Gladia package**
    ```bash
    npm install n8n-nodes-gladia
    ````

4. **Start n8n**
    ```bash
    n8n start
    ```

---

## Available Nodes

This package provides three nodes to interact with Gladia’s Speech-to-Text (STT) API and retrieve transcription results from audio files.

### 1. File Upload

The **File Upload** node lets you upload an audio file to Gladia.  
This step is **required** if your audio file isn’t publicly accessible (e.g., stored locally or behind authentication).  
It sends the audio file’s binary data to Gladia, where it’s securely stored, and returns a **file URL**.

That URL will be used in the next step.

**Input:**  
- Audio file (binary data)

**Output:**  
- File URL (used by the Start Transcription node)

---

### 2. Start Transcription

The **Start Transcription** node sends the audio URL to Gladia to start the transcription process.  
You can include various optional parameters to improve accuracy or customize output:

- `audio_language` — specify the spoken language  
- `custom_vocabulary` — provide a list of domain-specific terms  
- `custom_spelling` — define preferred spellings or formatting  
- Other options supported by the [Gladia API](https://docs.gladia.io/api-reference/v2/pre-recorded/init)

**Input:**  
- Audio file URL (from File Upload or a public URL)

**Output:**  
- Transcription request ID and metadata

---

### 3. Get Transcription

The **Get Transcription** node retrieves the full transcription data from Gladia.  
It performs a simple `GET` request using the transcription ID obtained in the previous step.

**Input:**  
- Transcription request ID

**Output:**  
- Full transcription text  
- Confidence scores  
- Summarization, chapterization, etc.

---

### Example Flow

A typical workflow might look like this:

1. **File Upload** → Upload local file and get URL  
2. **Start Transcription** → Send file URL to start transcription  
3. **Get Transcription** → Retrieve transcription results once complete

If your file is already public (e.g., hosted on an accessible URL), you can **skip the File Upload node** and start directly from **Start Transcription**.
