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
    MILVUS_URI = "http://localhost:19530" 
    COLLECTION_NAME = "kb_philosophy_nomic_embed_v2_q8"
    
    # OpenAI-Compatible API Configuration
    # Replace these with your provider's details (e.g., vLLM, LM Studio, Together, etc.)
    API_BASE_LLM = "https://api.anthropic.com/v1/" 
    API_BASE_EMBED = "http://localhost:3001/v1" 
    API_KEY_EMBED = "ai_K9eWAD9GHNs1lra48bianCeGG7Xtw88g" # Leave as "fake" or "fake-key" if your local endpoint doesn't require one
    API_KEY_LLM = os.getenv("API_KEY_LLM") # Leave as "fake" or "fake-key" if your local endpoint doesn't require one
    LLM_MODEL_NAME = "claude-haiku-4-5"
    EMBED_MODEL_NAME = "nomic-embed-text-v2-moe-q8_0"
    EMBED_DIMENSIONS = 768 # Must match the exact dimensions of your chosen embedding model
    
    # --- 2. Configure Settings with OpenAI-Compatible APIs ---
    print(f"Initializing LLM and Embedding models from {API_BASE_LLM} and {API_BASE_EMBED}...")
    
    # Set the Global LLM
    Settings.llm = OpenAILike(
        model=LLM_MODEL_NAME,
        api_base=API_BASE_LLM,
        api_key=API_KEY_LLM,
        is_chat_model=True,
        max_tokens=512,
        temperature=0.1
    )
    
    # Set the Global Embedding Model
    Settings.embed_model = OpenAILikeEmbedding(
        model_name=EMBED_MODEL_NAME,
        api_base=API_BASE_EMBED,
        api_key=API_KEY_EMBED,
        # embed_batch_size=10 # Uncomment and reduce if you encounter rate limits
    )

    # Set chunk size and overlap to respect the embedding server's 512 token batch/context limit
    Settings.chunk_size = 400
    Settings.chunk_overlap = 40

    # --- 3. Connect to Milvus Vector Store ---
    print(f"Connecting to Milvus at {MILVUS_URI}...")
    vector_store = MilvusVectorStore(
        uri=MILVUS_URI,
        collection_name=COLLECTION_NAME,
        dim=EMBED_DIMENSIONS,
    )
    
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

    query_engine = index.as_query_engine()
    response = query_engine.query("Explain about india")
    print("\nTest Query Response:", response)

if __name__ == "__main__":
    main()