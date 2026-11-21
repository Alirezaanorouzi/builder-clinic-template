import { createServer } from "node:http"
import { mkdir } from "node:fs/promises"
import path from "node:path"

import { Agent, JsonlLocalAgentStore } from "@cursor/sdk"

const WORKDIR = "/vercel/sandbox"
const AGENT_STORE_DIR = path.join(WORKDIR, ".cursor-agent-store")

const port = Number.parseInt(process.env.AGENT_RUNNER_PORT ?? "3921", 10)
const runnerSecret = process.env.AGENT_RUNNER_SECRET?.trim() ?? ""
const cursorApiKey = process.env.CURSOR_API_KEY?.trim() ?? ""

let instructions = []
try {
  const instructionsPath = path.join(WORKDIR, ".agent-instructions.json")
  const { readFile } = await import("node:fs/promises")
  const raw = await readFile(instructionsPath, "utf8")
  instructions = JSON.parse(raw)
} catch {
  instructions = [
    "شما در حال ساخت یک اپ React TypeScript با Next.js (App Router) برای پیش‌نمایش زنده هستید.",
    "فایل‌ها را مستقیماً در workspace فعلی ویرایش کنید.",
    "با کاربر به فارسی صحبت کنید.",
  ]
}

/** @type {import("@cursor/sdk").SDKAgent | undefined} */
let agent

async function getOrCreateAgent(sessionId, projectId) {
  if (agent) {
    return agent
  }
  if (!cursorApiKey) {
    throw new Error("CURSOR_API_KEY is not configured in the sandbox runner.")
  }

  await mkdir(AGENT_STORE_DIR, { recursive: true })
  const store = new JsonlLocalAgentStore(AGENT_STORE_DIR)
  const agentId = projectId
    ? `app-builder-project-${projectId}`
    : sessionId
    ? `app-builder-${sessionId}`
    : undefined

  agent = await Agent.create({
    apiKey: cursorApiKey,
    model: { id: process.env.CURSOR_MODEL ?? "composer-2" },
    local: {
      cwd: WORKDIR,
      settingSources: [],
      store,
    },
    ...(agentId ? { agentId } : {}),
  })

  return agent
}

function buildPrompt(body) {
  const previewUrl = typeof body.previewUrl === "string" ? body.previewUrl : ""
  const workspace =
    typeof body.workspace === "string" ? body.workspace : WORKDIR
  const userMessage = typeof body.message === "string" ? body.message : ""
  return [
    ...instructions,
    "",
    `Preview URL: ${previewUrl}`,
    `Workspace: ${workspace}`,
    "",
    "User request:",
    userMessage,
  ].join("\n")
}

function writeNdjson(res, event) {
  res.write(`${JSON.stringify(event)}\n`)
}

function unauthorized(res) {
  res.writeHead(401, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "unauthorized" }))
}

function parseAuth(req) {
  const header = req.headers.authorization ?? ""
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() ?? ""
}

async function handleChat(req, res, body) {
  if (!runnerSecret || parseAuth(req) !== runnerSecret) {
    unauthorized(res)
    return
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "message required" }))
    return
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  })

  try {
    const sdkAgent = await getOrCreateAgent(body.sessionId, body.projectId)
    const model =
      body.model && typeof body.model === "object" ? body.model : undefined
    const run = await sdkAgent.send(buildPrompt(body), model ? { model } : undefined)

    for await (const event of run.stream()) {
      for (const streamEvent of mapSdkMessage(event)) {
        writeNdjson(res, streamEvent)
      }
    }
    await run.wait()
    writeNdjson(res, { type: "status", status: "completed" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeNdjson(res, { type: "status", status: "error", message })
  } finally {
    res.end()
  }
}

function mapSdkMessage(event) {
  const events = []
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          events.push({ type: "assistant_delta", text: block.text })
        } else {
          events.push({
            type: "tool_call",
            callId: block.id,
            name: block.name,
            status: "requested",
            args: block.input,
          })
        }
      }
      break
    case "thinking": {
      const thinkingId =
        "id" in event && typeof event.id === "string" ? event.id : undefined
      events.push({ type: "thinking", id: thinkingId, text: event.text })
      break
    }
    case "tool_call":
      events.push({
        type: "tool_call",
        callId: event.call_id,
        name: event.name,
        status: event.status,
        args: event.args,
        truncatedArgs: event.truncated?.args,
      })
      break
    case "status":
      events.push({
        type: "status",
        status: event.status,
        message: event.message,
      })
      break
    case "task":
      events.push({ type: "task", status: event.status, text: event.text })
      break
    default:
      break
  }
  return events
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8")
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`)
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" })
      res.end("ok")
      return
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      const body = await readJsonBody(req)
      await handleChat(req, res, body)
      return
    }

    res.writeHead(404, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "not found" }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: message }))
  }
})

server.listen(port, "0.0.0.0", () => {
  console.log(`[agent-runner] listening on 0.0.0.0:${port}`)
})