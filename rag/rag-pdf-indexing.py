import os
from collections import defaultdict
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.llms.openai_like import OpenAILike
from llama_index.embeddings.openai_like import OpenAILikeEmbedding

def check_pdf_quality(text: str) -> bool:
    """
    Evaluates the extracted text from a PDF using heuristics to determine its quality.
    This prevents scanned PDFs (without OCR) or corrupted files from cluttering the vector store.
    """
    if not text:
        return False
        
    text_length = len(text.strip())
    
    # Check 1: Is the document practically empty? (Likely an image-based PDF without OCR)
    if text_length < 100:
        return False
        
    # Check 2: Is the text mostly gibberish/corrupted encoding?
    # A standard readable document should be highly alphanumeric.
    alphanumeric_count = sum(c.isalnum() for c in text)
    if (alphanumeric_count / text_length) < 0.6:
        return False
        
    return True

def main():
    # --- 1. Configuration ---
    FOLDER_PATH = "/home/bikash/Data/vidur-data/philosophy-books"  # Directory containing your PDFs
    MILVUS_URI = "http://localhost:19530" 
    COLLECTION_NAME = "kb_philosophy_nomic_embed_v2_q8"
    
    # OpenAI-Compatible API Configuration
    # Replace these with your provider's details (e.g., vLLM, LM Studio, Together, etc.)
    API_BASE_LLM = "http://localhost:3000/v1" 
    API_BASE_EMBED = "http://localhost:3001/v1" 
    API_KEY = "ai_K9eWAD9GHNs1lra48bianCeGG7Xtw88g" # Leave as "fake" or "fake-key" if your local endpoint doesn't require one
    LLM_MODEL_NAME = "Phi-4-mini-instruct-Q4_K_M"
    EMBED_MODEL_NAME = "nomic-embed-text-v2-moe-q8_0"
    EMBED_DIMENSIONS = 768 # Must match the exact dimensions of your chosen embedding model

    os.makedirs(FOLDER_PATH, exist_ok=True)
    
    # --- 2. Configure Settings with OpenAI-Compatible APIs ---
    print(f"Initializing LLM and Embedding models from {API_BASE_LLM} and {API_BASE_EMBED}...")
    
    # Set the Global LLM
    Settings.llm = OpenAILike(
        model=LLM_MODEL_NAME,
        api_base=API_BASE_LLM,
        api_key=API_KEY,
        is_chat_model=True,
        max_tokens=512,
        temperature=0.1
    )
    
    # Set the Global Embedding Model
    Settings.embed_model = OpenAILikeEmbedding(
        model_name=EMBED_MODEL_NAME,
        api_base=API_BASE_EMBED,
        api_key=API_KEY,
        # embed_batch_size=10 # Uncomment and reduce if you encounter rate limits
    )

    # Set chunk size and overlap to respect the embedding server's 512 token batch/context limit
    Settings.chunk_size = 400
    Settings.chunk_overlap = 40

    # --- 3. Load and Extract Data ---
    print(f"Reading PDFs from: {FOLDER_PATH}...")
    try:
        reader = SimpleDirectoryReader(input_dir=FOLDER_PATH, required_exts=[".pdf"])
        all_pages = reader.load_data()
    except ValueError:
        print(f"No PDFs found in {FOLDER_PATH}. Please add some files.")
        return

    # --- 4. Quality Check & Filtering ---
    # Group pages by file_name so we evaluate the entire PDF rather than single pages
    pages_by_file = defaultdict(list)
    for page in all_pages:
        file_name = page.metadata.get('file_name', 'Unknown')
        pages_by_file[file_name].append(page)

    high_quality_pages = []
    rejected_files = []

    for file_name, pages in pages_by_file.items():
        # Combine all page text to evaluate the document as a whole
        full_document_text = " ".join([page.get_content() for page in pages])
        
        if check_pdf_quality(full_document_text):
            high_quality_pages.extend(pages)
        else:
            rejected_files.append(file_name)

    # --- 5. Reporting ---
    print("\n--- Quality Check Results ---")
    print(f"Approved PDFs: {len(pages_by_file) - len(rejected_files)}")
    print(f"Rejected PDFs: {len(rejected_files)}")
    if rejected_files:
        for f in rejected_files:
            print(f"  - [REJECTED]: {f} (Likely scanned without OCR or bad encoding)")
            
    if not high_quality_pages:
        print("\nNo high-quality documents passed the check. Exiting pipeline.")
        return

    # --- 6. Configure Milvus and Indexing ---
    print("\nConnecting to Milvus and indexing documents...")
    
    vector_store = MilvusVectorStore(
        uri=MILVUS_URI,
        collection_name=COLLECTION_NAME,
        dim=EMBED_DIMENSIONS, 
        overwrite=True # Set to False to append to an existing collection instead of recreating it
    )
    
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # Generate embeddings and store them
    index = VectorStoreIndex.from_documents(
        high_quality_pages,
        storage_context=storage_context,
        show_progress=True
    )
    
    print(f"\nPipeline Complete! Successfully indexed {len(high_quality_pages)} pages.")

    # --- Example Query (Optional) ---
    # query_engine = index.as_query_engine()
    # response = query_engine.query("What is the main topic of the indexed documents?")
    # print("\nTest Query Response:", response)?

if __name__ == "__main__":
    main()