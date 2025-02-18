import { authOrLogin } from "@repo/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import { Metadata } from "next";
import ProfileForm, { ProfileFormValues } from "./components/profile-form";
import { User, usersTable } from "@repo/db/schema";
import db from "@repo/db";
import { eq } from "@repo/db/drizzle";

export const metadata: Metadata = {
  title: "Profile",
  description: "This is how others will see you on the site.",
};

async function ProfilePage() {
  const session = await authOrLogin();

  // NB: don't send the whole user object to the client:
  const user: User = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, session?.user.email),
  });

  const defaultValues: ProfileFormValues = {
    email: user.email,
    name: user.name || "",
  };

  return (
    <div className="grid gap-6">
      <Card x-chunk="dashboard-04-chunk-1">
        <CardHeader>
          <CardTitle>{metadata.title as string}</CardTitle>
          <CardDescription>{metadata.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultValues={defaultValues} />
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfilePage;
