import { redirect } from "next/navigation";

export default async function MockExamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/student/mock/${id}/attempt`);
}
