import os
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.embeddings.openai_like import OpenAILikeEmbedding

def check_pdf_quality(text: str) -> bool:
    """
    Evaluates the extracted text from a PDF using heuristics to determine its quality.
    This prevents scanned PDFs (without OCR) or corrupted files from cluttering the vector store.
    """
    if not text:
        return False
        
    text_length = len(text.strip())
    
    # Check 1: Is the document practically empty?
    if text_length < 100:
        return False
        
    # Check 2: Is the text mostly gibberish/corrupted encoding?
    alphanumeric_count = sum(c.isalnum() for c in text)
    if (alphanumeric_count / text_length) < 0.6:
        return False
        
    return True

def main():
    # --- 1. Configuration ---
    FOLDER_PATH = "/home/bikash/Data/vidur-data/philosophy-books"
    MILVUS_URI = "http://localhost:19530" 
    COLLECTION_NAME = "kb_philosophy_nomic_embed_v2_q8"
    
    API_BASE_EMBED = "http://localhost:3001/v1" 
    API_KEY_EMBED = "ai_K9eWAD9GHNs1lra48bianCeGG7Xtw88g"
    EMBED_MODEL_NAME = "nomic-embed-text-v2-moe-q8_0"
    EMBED_DIMENSIONS = 768 

    os.makedirs(FOLDER_PATH, exist_ok=True)
    
    # --- 2. Configure Settings ---
    print(f"Initializing Embedding model from {API_BASE_EMBED}...")
    
    Settings.embed_model = OpenAILikeEmbedding(
        model_name=EMBED_MODEL_NAME,
        api_base=API_BASE_EMBED,
        api_key=API_KEY_EMBED,
    )

    Settings.chunk_size = 400
    Settings.chunk_overlap = 40

    # --- 3. Connect to Milvus Vector Store ---
    print(f"\nConnecting to Milvus at {MILVUS_URI}...")
    vector_store = MilvusVectorStore(
        uri=MILVUS_URI,
        collection_name=COLLECTION_NAME,
        dim=EMBED_DIMENSIONS, 
        overwrite=False # CRITICAL: Keep False so we append to the collection incrementally
    )
    
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    # Load the existing index to insert new documents
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        storage_context=storage_context
    )

    # --- 4. Iterative Processing & Quality Filtering ---
    print(f"\nScanning directory: {FOLDER_PATH} for new PDFs...")
    
    files_processed = 0
    files_rejected = 0

    for filename in os.listdir(FOLDER_PATH):
        if filename.lower().endswith(".pdf"):
            file_path = os.path.join(FOLDER_PATH, filename)
            print(f"\nProcessing: {filename}...")
            
            try:
                # Load the single file
                reader = SimpleDirectoryReader(input_files=[file_path])
                pages = reader.load_data()
                
                # Combine text to evaluate the document as a whole
                full_document_text = " ".join([page.get_content() for page in pages])
                
                # Quality Check
                if not check_pdf_quality(full_document_text):
                    print(f"  -> [REJECTED]: {filename} failed quality check (Likely scanned/no OCR). Skipping.")
                    files_rejected += 1
                    
                    # Optional: Rename to .rejected to avoid processing it again next run
                    # os.rename(file_path, file_path + ".rejected") 
                    continue
                
                # Insert high-quality pages into Milvus
                print(f"  -> Quality check passed! Indexing {len(pages)} pages...")
                for page in pages:
                    index.insert(page)
                
                # Mark as done
                done_path = file_path + ".done"
                os.rename(file_path, done_path)
                print(f"  -> [SUCCESS]: Renamed to {filename}.done")
                files_processed += 1
                
            except Exception as e:
                print(f"  -> [ERROR]: Failed to process {filename}: {e}")

    # --- 5. Final Report ---
    print("\n--- Pipeline Complete ---")
    print(f"Successfully Indexed: {files_processed} files")
    print(f"Rejected/Skipped: {files_rejected} files")

if __name__ == "__main__":
    main()