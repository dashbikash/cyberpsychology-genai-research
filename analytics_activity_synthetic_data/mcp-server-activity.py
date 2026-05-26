"""
FastMCP quickstart example.

Run from the repository root:
    uv run examples/snippets/servers/fastmcp_quickstart.py
"""

from mcp.shared import tool_name_validation
from click import style
from datetime import datetime
from anyio import abc
from mcp.server.fastmcp import FastMCP
import os
import glob
import psycopg2
import urllib.parse



DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "context-db"
DB_USER = "postgres"
DB_PASSWORD = "password"

# Create an MCP server
mcp = FastMCP("Cyberpsychology", json_response=True)


# Add an addition tool
@mcp.tool()
def activity_summary(user:str,device:str,window_days:int=2) -> str:
    """Get Summary of user activity in that duration"""
    conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
    timestamp_end = datetime.now().timestamp() * 1000
    timestamp_start = timestamp_end - (window_days * 86400000)

    clean_start = int(timestamp_start)
    clean_end = int(timestamp_end)
    query = f"""
    SELECT timestamp, app_package, app_category, focus_type 
    FROM app_activity_logs 
    WHERE timestamp BETWEEN {clean_start} AND {clean_end}
    """
    print(clean_start,clean_end,query)
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return "\n".join([f"{row[0]}: {row[1]} ({row[2]}) - {row[3]}" for row in result])


# Add a dynamic greeting resource
@mcp.resource("activity://{user}/{device}/{window_days}")
def get_activity(user: str, device: str, window_days:int) -> str:
    """Get user activity data from the database"""
    return f"{activity_summary(user, device, window_days)}"


# Add a prompt
@mcp.prompt()
def greet_user(user: str, device: str, window_days: int, style: str = "psychologist") -> str:
    """Generate a greeting prompt"""
    styles = {
        "psychologist": "Please analyze this user's activity and give some insights",
        "debugger": "Please check if there are any issues with the user's activity",
    }

    return f"{styles.get(style, styles['psychologist'])} for someone named {user}."


# Run with streamable HTTP transport
if __name__ == "__main__":
    mcp.run(transport="streamable-http")