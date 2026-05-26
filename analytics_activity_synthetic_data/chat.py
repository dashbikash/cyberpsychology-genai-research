import asyncio
import os
from openai import AsyncOpenAI

# 1. Initialize the Async Client
# It will automatically look for the OPENAI_API_KEY environment variable.
# You can also pass api_key="your_key" directly, along with base_url if needed.
client = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("OPENAI_API_KEY", "")
)

# You can change this to "gpt-3.5-turbo" or your custom model name
MODEL_NAME = "groq/compound-mini" 

async def chat_loop():
    print(f"--- Started Async Chat ({MODEL_NAME}) ---")
    print("Type 'quit' or 'exit' to end the conversation.\n")
    
    # 2. Setup the message history
    messages = [
        {"role": "system", "content": "You are a helpful, concise assistant."}
    ]

    while True:
        # Get user input
        user_input = input("You: ")
        
        # Exit condition
        if user_input.lower() in ['quit', 'exit']:
            print("Ending chat. Goodbye!")
            break
            
        # Add user message to context
        messages.append({"role": "user", "content": user_input})
        
        print("AI: ", end="", flush=True)
        
        try:
            # 3. Create the asynchronous streaming request
            stream = await client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                stream=True # Enable streaming
            )
            
            # 4. Iterate over the async stream
            assistant_response = ""
            async for chunk in stream:
                # Extract the text content from the stream chunk
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    assistant_response += content
            
            print("\n") # Add a newline after the full response
            
            # 5. Save the AI's response to the message history
            messages.append({"role": "assistant", "content": assistant_response})
            
        except Exception as e:
            print(f"\nAn error occurred: {e}\n")

# 6. Run the async event loop
if __name__ == "__main__":
    # asyncio.run() sets up the event loop and executes the main coroutine
    asyncio.run(chat_loop())
