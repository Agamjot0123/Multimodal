import type { CourseSource } from "@/types/contract";

/** Placeholder course until Member 1's curated dataset lands. Drop files in /public/media. */
export const MOCK_COURSE_ID = "cs101-demo";

export const MOCK_SOURCES: CourseSource[] = [
  {
    file_name: "lecture_03_backprop.mp4",
    kind: "video",
    title: "Lecture 3: Backpropagation",
    url: "/media/lecture_03_backprop.mp4",
    duration: 2710,
  },
  {
    file_name: "lecture_03_slides.pdf",
    kind: "slides",
    title: "Lecture 3 Slides",
    url: "/media/lecture_03_slides.pdf",
    pages: 32,
  },
  {
    file_name: "deep_learning_textbook.pdf",
    kind: "pdf",
    title: "Textbook: Deep Learning",
    url: "/media/deep_learning_textbook.pdf",
    pages: 412,
  },
];

export const MOCK_SKILLS = [
  { skill: "Chain Rule", mastery: 0.72 },
  { skill: "Gradients", mastery: 0.55 },
  { skill: "Backprop", mastery: 0.31 },
  { skill: "Loss Fns", mastery: 0.64 },
  { skill: "Optimizers", mastery: 0.18 },
];
