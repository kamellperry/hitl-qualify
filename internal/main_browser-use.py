import asyncio
import json
from typing import Any
from browser_use.utils import Coroutine
from typing_extensions import TypedDict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from browser_use import Agent, BrowserConfig, BrowserContextConfig, Browser
from browser_use.browser.context import BrowserContext
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
llm = ChatOpenAI(model="gpt-4o-mini")

# Use a different port for Chrome debugging (not 8000)
CHROME_DEBUG_PORT = 9222

# Configure browser to connect to running Chrome instance
browser = Browser(
    BrowserConfig(
        headless=False,
        cdp_url=f"http://127.0.0.1:{CHROME_DEBUG_PORT}",  # Use http:// not ws://
    )
)

context = BrowserContext(
    browser=browser,
    config=BrowserContextConfig(
        wait_for_network_idle_page_load_time=3.0,
        browser_window_size={"width": 1280, "height": 1100},
        locale="en-US",
        highlight_elements=True,
    ),
)


class TaskPayload(BaseModel):
    instructions: str
    storage_state: dict[str, Any] | None = None  # Optional URL to navigate to


class TaskResponse(BaseModel):
    id: str
    output: str
    status: str


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/run-task")
async def run_task(payload: Request) -> JSONResponse:
    try:
        request_data: Coroutine[Any, Any, TaskPayload] = await payload.json()
        instructions = request_data.get("instructions")
        storage_state = request_data.get("storage_state")

        print("--------------------------------")
        print(request_data)
        print("--------------------------------")

        # Create a new browser instance with your stored state
        browser_config = BrowserConfig(
            headless=False,
            # Optional: can use storage state from the request
        )

        browser_instance = Browser(browser_config)
        context_instance = BrowserContext(
            browser=browser_instance,
            config=BrowserContextConfig(
                cookies_file="/Users/kamell/Desktop/quick/data/auth/elevatewealthpro.json",
                wait_for_network_idle_page_load_time=3.0,
                browser_window_size={"width": 1280, "height": 1100},
                locale="en-US",
                highlight_elements=True,
            ),
        )

        # Apply the storage state if provided
        if storage_state:
            # Browser Use needs a mechanism to apply storage state
            # This may require custom implementation or extension
            # await context_instance.add_cookies(storage_state.get("cookies", []))
            pass

        agent = Agent(
            task=instructions,
            llm=llm,
            browser_context=context_instance,
        )

        result = await agent.run()

        # Optionally get updated storage state to return
        # updated_state = await context_instance.storage_state()

        await browser_instance.close()

        return JSONResponse({"id": "task_123", "output": result, "status": "finished"})
    except Exception as e:
        return JSONResponse({"id": "task_123", "output": str(e), "status": "failed"})
