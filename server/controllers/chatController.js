import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import {
  generateText,
  generateImage,
  generateAudio,
  generateVideo,
} from "../services/geminiService.js";

// --- isValidObjectId and getAllChats are unchanged ---
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(chats);
  } catch (error) {
    console.error("GET ALL CHATS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch chats." });
  }
};

// --- getChatById is unchanged ---
export const getChatById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id))
    return res.status(400).json({ error: "Invalid chat ID." });
  try {
    const chat = await Chat.findOne({ _id: id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    res.json(chat);
  } catch (error) {
    console.error("GET CHAT ERROR:", error);
    res.status(500).json({ error: "Failed to fetch chat." });
  }
};

/**
 * CREATE NEW CHAT with initial prompt and AI response
 * This function now saves the chat first, then attempts generation.
 */
export const createChat = async (req, res) => {
  const { initialPrompt, mode = "Text" } = req.body;
  if (!initialPrompt)
    return res.status(400).json({ error: "Initial prompt is required." });

  // Step 1: Create and save the chat with the user's message first.
  let newChat = new Chat({
    user: req.user._id,
    title: initialPrompt.substring(0, 40), // Set initial title
    messages: [{ role: "user", type: "prompt", content: initialPrompt }],
  });

  try {
    await newChat.save(); // Ensure the chat is saved before proceeding.
  } catch (saveError) {
    console.error("INITIAL CHAT SAVE ERROR:", saveError);
    return res
      .status(500)
      .json({ error: "Failed to create and save new chat." });
  }

  // Step 2: Now that the chat is saved, attempt to generate the AI response.
  try {
    let aiResponseContent;
    switch (mode.toLowerCase()) {
      case "text":
        aiResponseContent = await generateText(initialPrompt);
        break;
      case "image":
        aiResponseContent = await generateImage(initialPrompt);
        break;
      case "audio":
        aiResponseContent = await generateAudio(initialPrompt);
        break;
      case "video":
        aiResponseContent = await generateVideo(initialPrompt);
        break;
      default:
        aiResponseContent = await generateText(initialPrompt);
    }

    // Add the successful AI response and save again.
    newChat.messages.push({
      role: "assistant",
      type: mode.toLowerCase(),
      content: aiResponseContent,
    });
  } catch (generationError) {
    console.error("CREATE CHAT - GENERATION ERROR:", generationError);
    // If generation fails, add an error message to the chat.
    newChat.messages.push({
      role: "assistant",
      type: "error",
      content: "Failed to get a response from the AI. Please try again later.",
    });
  }

  // Step 3: Save the final state of the chat (with AI response or error) and send to client.
  try {
    const savedChat = await newChat.save();
    res.status(201).json(savedChat);
  } catch (finalSaveError) {
    console.error("FINAL CHAT SAVE ERROR:", finalSaveError);
    res.status(500).json({ error: "Failed to finalize chat creation." });
  }
};

// --- addMessageToChat, deleteChat, and renameChat are unchanged ---
export const addMessageToChat = async (req, res) => {
  const { content, mode = "Text" } = req.body;
  const { id } = req.params;

  if (!content)
    return res.status(400).json({ error: "Message content is required." });
  if (!isValidObjectId(id))
    return res.status(400).json({ error: "Invalid chat ID." });

  try {
    const chat = await Chat.findOne({ _id: id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const userMsg = { role: "user", type: "prompt", content };
    chat.messages.push(userMsg);

    let aiResponseContent;
    let aiMsgType = mode.toLowerCase();

    try {
      switch (mode.toLowerCase()) {
        case "text":
          aiResponseContent = await generateText(content);
          break;
        case "image":
          aiResponseContent = await generateImage(content);
          break;
        case "audio":
          aiResponseContent = await generateAudio(content);
          break;
        case "video":
          aiResponseContent = await generateVideo(content);
          break;
        default:
          aiResponseContent = await generateText(content);
      }
    } catch (generationError) {
      console.error("ADD MESSAGE - GENERATION ERROR:", generationError);
      aiResponseContent = "Failed to get a response. Please try again.";
      aiMsgType = "error";
    }

    const aiMsg = {
      role: "assistant",
      type: aiMsgType,
      content: aiResponseContent,
    };
    chat.messages.push(aiMsg);

    await chat.save();
    res.status(201).json({ user: userMsg, assistant: aiMsg });
  } catch (error) {
    console.error("ADD MESSAGE ERROR:", error);
    res.status(500).json({ error: "Failed to add message." });
  }
};

export const deleteChat = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id))
    return res.status(400).json({ error: "Invalid chat ID." });
  try {
    const deletedChat = await Chat.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    if (!deletedChat) return res.status(404).json({ error: "Chat not found." });
    res.json({ message: "Chat deleted successfully.", chat: deletedChat });
  } catch (error) {
    console.error("DELETE CHAT ERROR:", error);
    res.status(500).json({ error: "Failed to delete chat." });
  }
};

export const renameChat = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title)
    return res.status(400).json({ error: "New chat title is required." });
  if (!isValidObjectId(id))
    return res.status(400).json({ error: "Invalid chat ID." });

  try {
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title },
      { new: true }
    );
    if (!updatedChat) return res.status(404).json({ error: "Chat not found." });
    res.json(updatedChat);
  } catch (error) {
    console.error("RENAME CHAT ERROR:", error);
    res.status(500).json({ error: "Failed to rename chat." });
  }
};
