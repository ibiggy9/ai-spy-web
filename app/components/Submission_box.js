"use client";
import { motion } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@nextui-org/react";
import { RiUploadCloud2Fill } from "react-icons/ri";
import { RiMusicFill } from "react-icons/ri";
import { RiCloseLine } from "react-icons/ri";

export default function Submission_box({ onSubmit, isAnalyzing, error }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const MAX_FILE_SIZE = 32 * 1024 * 1024;

  const isFileUploaded = () => {
    return selectedFile && uploadProgress[selectedFile.name] === 100;
  };

  const updateProgress = (fileId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress((prev) => ({
        ...prev,
        [fileId]: Math.round(progress),
      }));
    }, 200);

    return () => clearInterval(interval);
  };

  React.useEffect(() => {
    if (selectedFile && !uploadProgress[selectedFile.name]) {
      updateProgress(selectedFile.name);
    }
  }, [selectedFile]);

  const isValidFileType = (file) => {
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];

    const mimeTypeValid = validTypes.includes(file.type);

    const fileName = file.name.toLowerCase();
    const extensionValid =
      fileName.endsWith(".mp3") || fileName.endsWith(".wav");

    return mimeTypeValid && extensionValid;
  };

  const sanitizeFilename = (filename) => {
    const sanitized = filename.replace(/^.*[\\\/]/, "");

    return sanitized.replace(/[^\w\s.-]/g, "_");
  };

  const handleFileUpload = (event) => {
    event.preventDefault();
    const files = event.target.files || event.dataTransfer.files;
    const file = files[0];

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert("File size exceeds 40MB limit");
        return;
      }

      if (isValidFileType(file)) {
        const sanitizedName = sanitizeFilename(file.name);
        const sanitizedFile = new File([file], sanitizedName, {
          type: file.type,
        });
        setSelectedFile(sanitizedFile);
      } else {
        alert("Please upload only .wav or .mp3 files with valid audio content");
      }
    }
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    if (selectedFile && isFileUploaded()) {
      onSubmit(selectedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1, type: "spring", stiffness: 100, delay: 0.5 }}
      className="flex flex-col overflow-hidden bg-zinc-800 rounded-2xl p-4 md:p-8 w-full max-w-[600px] mx-4"
    >
      <div className="text-white text-2xl flex items-center justify-between">
        <div className="px-2"> Upload File</div>
      </div>
      <div className=" px-2 pb-5 text-slate-500 text-sm ">
        Drop or upload a file to get started.
      </div>

      {}
      <div
        className={`border ${isDragging ? "border-green-500" : "border-dashed border-white"} py-6 md:py-10 px-4 md:px-24 rounded-2xl flex flex-col justify-center items-center`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileUpload}
      >
        {!selectedFile ? (
          <div className="flex justify-center flex-col items-center">
            <div className="text-white text-md mt-3">
              Drag and drop an audio file to upload...
            </div>
            <div className="text-slate-500 text-xs my-3 w-60 text-center">
              Accepts: Mp3 and WAV files only (Max 40MB)
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: "tween" }}
            className="flex flex-col items-center"
          >
            <div className="text-white text-lg mb-3 mt-3 text-center">
              File selected
            </div>
          </motion.div>
        )}

        {}
        <input
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          ref={fileInputRef}
        />

        <RiUploadCloud2Fill size={60} color="white" />
        <div className="flex justify-center items-center w-60">
          {}
          <div
            className="text-white flex flex-row"
            onClick={() => fileInputRef.current.click()}
          >
            <button className="underline">
              {selectedFile ? "Choose different file" : "Click to upload "}
            </button>
            <div className="ml-1">{selectedFile ? "" : "or drag and drop"}</div>
          </div>
        </div>
        <div className="mt-auto p-4 text-center">
          <p className="text-slate-300 text-xs">
            Ai-SPY can make mistakes, so double check results.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Not trained to detect AI-generated music, only speech.
          </p>
        </div>
      </div>

      {}
      {selectedFile && (
        <div>
          <div className="text-white text-lg mt-3">Selected File:</div>
          <div className="flex items-center justify-between bg-zinc-700 p-3 rounded-lg relative">
            <div className="flex items-center gap-3">
              <RiMusicFill className="text-blue-500" size={24} />
              <div className="flex flex-col">
                <div className="text-white text-sm truncate max-w-[200px]">
                  {selectedFile.name}
                </div>
                <div className="text-slate-500 text-xs">
                  {Math.round(selectedFile.size * 0.000001)} MB
                </div>
                <div className="flex items-center gap-4">
                  {}
                  <div className="flex items-center gap-2">
                    <div className="w-full md:w-96 mt-2 bg-slate-700 rounded-full h-2">
                      <div
                        className={`${uploadProgress[selectedFile.name] === 100 ? "bg-green-500" : "bg-blue-500"} h-2 rounded-full transition-all duration-300`}
                        style={{
                          width: `${uploadProgress[selectedFile.name] || 0}%`,
                        }}
                      />
                    </div>

                    <span className="text-slate-400 text-xs mt-1">
                      {Math.round(uploadProgress[selectedFile.name] || 0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <button
              onClick={() => {
                setSelectedFile(null);
                setUploadProgress({});
              }}
              className="text-slate-400 hover:text-white transition-colors absolute top-2 right-2"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
        </div>
      )}

      {}
      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isAnalyzing}
            className={`w-48 bg-gradient-to-r text-white from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent hover:before:bg-gradient-to-r hover:before:from-transparent hover:before:via-white/40 hover:before:to-transparent ${isAnalyzing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isAnalyzing ? "Processing..." : "Submit"}
          </Button>
        </div>
      )}
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </motion.div>
  );
}
