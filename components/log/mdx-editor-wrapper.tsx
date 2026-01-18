"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import MDXEditor to avoid SSR issues
const MDXEditor = dynamic(
  () => import("@mdxeditor/editor").then((mod) => mod.MDXEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-slate-50">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    ),
  }
);

// Import plugins
import {
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  UndoRedo,
  Separator,
} from "@mdxeditor/editor";

import "@mdxeditor/editor/style.css";

interface LogContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LogContentEditor({
  value,
  onChange,
  placeholder = "Write your update here...",
}: LogContentEditorProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <MDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        contentEditableClassName="prose prose-slate max-w-none min-h-[200px] p-4 focus:outline-none"
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
          listsPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <CreateLink />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
