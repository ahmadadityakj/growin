"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProductService, type ProductInput } from "@/server/services/product-service";
import { db } from "@/server/db";
import { productKnowledge } from "@/server/db/schema";
import { eq } from "drizzle-orm";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createProduct(input: ProductInput) {
  await requireAuth();
  const product = await ProductService.create(input);
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireAuth();
  await ProductService.update(id, input);
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await requireAuth();
  await ProductService.softDelete(id);
  revalidatePath("/products");
}

export async function addProductKnowledge(productId: string, title: string, content: string) {
  await requireAuth();
  await db.insert(productKnowledge).values({ productId, title, content });
  revalidatePath(`/products/${productId}/edit`);
}

export async function deleteProductKnowledge(knowledgeId: string, productId: string) {
  await requireAuth();
  await db.delete(productKnowledge).where(eq(productKnowledge.id, knowledgeId));
  revalidatePath(`/products/${productId}/edit`);
}

export async function toggleProductKnowledge(knowledgeId: string, productId: string, isActive: boolean) {
  await requireAuth();
  await db
    .update(productKnowledge)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(productKnowledge.id, knowledgeId));
  revalidatePath(`/products/${productId}/edit`);
}
