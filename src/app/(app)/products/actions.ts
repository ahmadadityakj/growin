"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProductService, type ProductInput } from "@/server/services/product-service";

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
