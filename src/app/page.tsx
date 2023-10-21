"use client";
import generateRandomString from "@/utils/generateRandomString";
import { cn } from "@/utils/cn";
import { ChatOllama } from "langchain/chat_models/ollama";
import { AIMessage, HumanMessage } from "langchain/schema";
import React, { useRef } from "react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshIcon } from "@/components/icons/refresh-icon";
import { CopyIcon } from "@/components/icons/copy-icon";
import { TrashIcon } from "@/components/icons/trash-icon";

export default function Home() {
  const [newPrompt, setNewPrompt] = useState("");
  const [messages, setMessages] = useState<
    {
      type: string;
      id: any;
      timestamp: number;
      content: string;
      model?: string;
    }[]
  >([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [activeModel, setActiveModel] = useState<string>("");
  const [ollama, setOllama] = useState<ChatOllama>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 200 ? "auto" : "hidden"
      }`;
    }
  }, [newPrompt]);

  useEffect(() => {
    // Get models
    fetch("http://localhost:11434/api/tags")
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setAvailableModels(data.models);
        console.log(data.models[0]?.name);
        setActiveModel(data.models[0]?.name);
        const initOllama = new ChatOllama({
          baseUrl: "http://localhost:11434",
          model: data.models[0]?.name,
        });
        setOllama(initOllama);
      });

    // Get existing conversations
    getExistingConvos();
  }, []);

  async function getExistingConvos() {
    fetch("../api/fs/get-convos", {
      method: "POST", // or 'GET', 'PUT', etc.
      body: JSON.stringify({
        conversationPath: "./conversations",
      }),
    }).then((response) =>
      response.json().then((data) => setConversations(data)),
    );
  }

  // async function getChatName() {}

  async function triggerPrompt() {
    if (!ollama) return;
    if (messages.length == 0) getName(newPrompt);
    const msg = {
      type: "human",
      id: generateRandomString(8),
      timestamp: Date.now(),
      content: newPrompt,
    };
    const model = activeModel;
    let streamedText = "";
    messages.push(msg);
    const msgCache = [...messages];
    const stream = await ollama.stream(
      messages.map((m) =>
        m.type == "human"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
    );
    setNewPrompt("");
    for await (const chunk of stream) {
      streamedText += chunk.content;
      const aiMsg = {
        type: "ai",
        id: generateRandomString(8),
        timestamp: Date.now(),
        content: streamedText,
        model,
      };
      const updatedMessages = [...msgCache, aiMsg];
      setMessages(() => updatedMessages);
    }
  }

  function getName(input: string) {
    // TODO: fix the model used to get this name
    ollama
      ?.predict(
        "You're a tool, that receives an input and responds with a 2-5 word summary of the topic underlying that input. Each word in the summary should be carefully chosen so that it's perfecly informative - and serve as a perfect title for the conversation that follows. Now, return the summary for the following input:\n" +
          input,
      )
      .then((name) => console.log(name));
  }

  function toggleModel() {
    const i =
      (availableModels.findIndex((x) => x.name == activeModel) + 1) %
      availableModels.length;
    console.log(i, activeModel, availableModels);
    setActiveModel(availableModels[i].name);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-16">
      <div className="flex h-full w-full grow flex-col items-center justify-end gap-y-4 whitespace-break-spaces">
        {messages.map((msg) => (
          <div
            key={"message-" + msg.id}
            className={cn(
              "flex h-fit max-w-[80%] cursor-pointer flex-col items-start gap-y-1 rounded-md px-2 py-1",
              { "ml-auto": msg.type == "human" },
              { "mr-auto": msg.type == "ai" },
            )}
          >
            <div
              className={cn(
                "flex h-fit w-full cursor-pointer flex-col items-center gap-y-1 rounded-md border border-[#191919] px-2 py-1",
                { "ml-auto": msg.type == "human" },
                { "mr-auto": msg.type == "ai" },
              )}
            >
              <p className="mr-auto text-xs text-white/50">
                {(msg?.model?.split(":")[0] || "user") +
                  " • " +
                  new Date(msg.timestamp).toLocaleDateString() +
                  " " +
                  new Date(msg.timestamp).toLocaleTimeString()}
              </p>
              <Markdown
                remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                // components={{

                // }}
                className={"mr-auto flex flex-col text-sm text-white"}
              >
                {msg.content.trim()}
              </Markdown>
            </div>
            <div
              className={cn(
                "my-2 flex gap-x-1",
                { "ml-auto": msg.type == "human" },
                { "mr-auto": msg.type == "ai" },
              )}
            >
              <RefreshIcon className="h-4 w-4 fill-white/50 hover:fill-white/75" />
              <CopyIcon className="h-4 w-4 fill-white/50 hover:fill-white/75" />
              <TrashIcon className="h-4 w-4 fill-white/50 hover:fill-white/75" />
            </div>
          </div>
        ))}
        <textarea
          ref={textareaRef}
          onChange={(e) => {
            setNewPrompt(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.shiftKey && !e.altKey) {
              triggerPrompt();
            } else if (
              e.key === "Enter" &&
              (e.metaKey || !e.shiftKey || !e.altKey)
            ) {
              console.log(e);
            }
          }}
          rows={1}
          className="block max-h-[200px] w-full resize-none appearance-none rounded-md border border-[#191919] bg-[#0a0a0a]/80 px-6 py-4 text-sm font-normal text-white outline-0 focus:outline-0 focus:ring-white/10 md:flex"
          placeholder="Send a message"
          value={newPrompt}
        ></textarea>
        <button
          className="cursor-pointer text-xs text-white/50 transition-colors hover:text-white/80"
          contentEditable={false}
          onClick={toggleModel}
        >
          {activeModel}
        </button>
      </div>
    </main>
  );
}
