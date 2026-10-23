"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import MDXEditor to avoid SSR issues
const MDXEditor = dynamic(
  () => import("@mdxeditor/editor").then((mod) => mod.MDXEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Import plugins
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
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
  autoFocus?: boolean;
  /** Drops the heading picker so the toolbar fits a narrow sheet on one row */
  compact?: boolean;
  className?: string;
}

export function LogContentEditor({
  value,
  onChange,
  placeholder = "Write your update here...",
  autoFocus,
  compact = false,
  className,
}: LogContentEditorProps) {
  return (
    <div className={cn("console-editor", className)}>
      <MDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        // Matches LogPostContent, so the draft reads like the posted entry
        contentEditableClassName="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed text-foreground prose-p:my-0 [&_p+p]:mt-3 prose-blockquote:font-normal prose-strong:font-semibold prose-strong:text-foreground focus:outline-none"
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
          listsPlugin(),
          quotePlugin(),
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
                {!compact && (
                  <>
                    <BlockTypeSelect />
                    <Separator />
                  </>
                )}
                <CreateLink />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
