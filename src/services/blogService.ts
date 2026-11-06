
import type { Author } from "../types/author";
import type { Post } from "../types/post";
import type { Comment } from "../types/comment.ts";

// Autores ficticios del blog
export const mockAuthors: Author[] = [
  {
    id: "a1",
    name: "Lucía Fernández",
    email: "lucia@ejemplo.com",
    bio: "Apasionada por la alimentación natural",
  },
  {
    id: "a2",
    name: "Martín López",
    email: "martin@ejemplo.com",
    bio: "Comparte recetas e ideas de cocina saludable",
  },
];

// Artículos ficticios
const mockPosts: Post[] = [
  {
    id: "post1",
    title: "Beneficios de los frutos secos",
    content:
      "Los frutos secos aportan grasas saludables, fibra y nutrientes importantes para una alimentación variada.",
    authorId: "a1",
    createdAt: "2026-10-20",
    category: "Nutrición",
  },
  {
    id: "post2",
    title: "Cómo preparar granola casera",
    content:
      "Podés preparar granola con avena, almendras, nueces y semillas, combinando ingredientes a tu gusto.",
    authorId: "a2",
    createdAt: "2026-10-22",
    category: "Recetas",
  },
  {
    id: "post3",
    title: "Ideas para incorporar semillas",
    content:
      "Las semillas pueden incorporarse a yogures, ensaladas, panes y otras preparaciones.",
    authorId: "a1",
    createdAt: "2026-10-25",
    category: "Consejos",
  },
];

// Comentarios simulados, organizados por artículo
const commentsByPost: Record<string, Comment[]> = {
  post1: [],
  post2: [],
  post3: [],
};

// Obtener todos los artículos
export function getPosts(): Post[] {
  return [...mockPosts];
}

// Obtener artículos de un autor
export function getPostsByAuthor(id: string): Post[] {
  return mockPosts.filter((post) => post.authorId === id);
}

// Agregar un comentario a un artículo
export function addComment(
  postId: string,
  comment: Comment
): void {
  const postExists = mockPosts.some(
    (post) => post.id === postId
  );

  if (!postExists) {
    throw new Error("El artículo no existe");
  }

  if (comment.postId !== postId) {
    throw new Error(
      "El comentario no pertenece al artículo indicado"
    );
  }

  commentsByPost[postId].push({ ...comment });
}

// Obtener comentarios de un artículo
export function getCommentsByPost(
  postId: string
): Comment[] {
  return [...(commentsByPost[postId] ?? [])];
}
