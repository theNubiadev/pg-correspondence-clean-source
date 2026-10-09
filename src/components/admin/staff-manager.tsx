"use client";

import { useActionState, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { Field, FieldGroup } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  resolveUniversityType,
  UNIVERSITY_TYPE_OPTIONS,
} from "@/lib/auth/university-types";
import { ROLE_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserStatusFormAction,
  updateUserAction,
} from "@/server/actions/admin";
import { idleState, type ActionState } from "@/server/actions/types";

export type StaffRow = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  userType: string | null;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  destinationOffice?: { officeName: string } | null;
};

function userTypeLabel(userType: string | null): string {
  return resolveUniversityType(userType)?.label ?? userType ?? "—";
}

function assignedUnit(user: StaffRow): string {
  return (
    user.destinationOffice?.officeName ??
    resolveUniversityType(user.userType)?.officeName ??
    "Provost Office"
  );
}

function accessRole(role: string): string {
  return ROLE_META[role as keyof typeof ROLE_META]?.label ?? role;
}

export function StaffManager({ users }: { users: StaffRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add staff account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create staff account</DialogTitle>
            </DialogHeader>
            <CreateUserForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="surface-flat hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>User type</TableHead>
              <TableHead>Assigned unit</TableHead>
              <TableHead>Access role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-mono text-sm font-medium">{user.username}</p>
                    <p className="text-muted-foreground text-xs">{user.fullName}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{userTypeLabel(user.userType)}</TableCell>
                <TableCell className="text-sm">{assignedUnit(user)}</TableCell>
                <TableCell className="text-sm">{accessRole(user.role)}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                    {user.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <StaffActions user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <article key={user.id} className="surface-flat space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-medium">{user.username}</p>
                <p className="text-muted-foreground text-xs">{user.fullName}</p>
              </div>
              <StaffActions user={user} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">User type</dt>
                <dd>{userTypeLabel(user.userType)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Assigned unit</dt>
                <dd>{assignedUnit(user)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Access role</dt>
                <dd>{accessRole(user.role)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{user.status === "ACTIVE" ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function StaffActions({ user }: { user: StaffRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const deactivating = user.status === "ACTIVE";
  const nameMatches = confirmName.trim().toLowerCase() === user.username.toLowerCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <MoreHorizontal className="size-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            Reset password
          </DropdownMenuItem>
          <DropdownMenuItem
            variant={deactivating ? "destructive" : "default"}
            onSelect={() => setStatusOpen(true)}
          >
            {deactivating ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {user.username}</DialogTitle>
          </DialogHeader>
          <EditUserForm user={user} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={`Reset password for ${user.username}?`}
        description="The new password takes effect immediately. The officer will need it to sign in."
        confirmLabel="Set new password"
      >
        <ResetPasswordForm userId={user.id} />
      </ConfirmDialog>

      <form action={toggleUserStatusFormAction} id={`status-${user.id}`}>
        <input type="hidden" name="id" value={user.id} />
        <input
          type="hidden"
          name="active"
          value={deactivating ? "false" : "true"}
        />
      </form>
      <ConfirmDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={
          deactivating
            ? `Deactivate ${user.username}?`
            : `Activate ${user.username}?`
        }
        description={
          deactivating
            ? "This account will no longer be able to sign in. Type the username to confirm."
            : "This account will be able to sign in again."
        }
        confirmLabel={deactivating ? "Deactivate account" : "Activate account"}
        destructive={deactivating}
        onConfirm={() => {
          if (deactivating && !nameMatches) return;
          const form = document.getElementById(
            `status-${user.id}`,
          ) as HTMLFormElement | null;
          form?.requestSubmit();
          setStatusOpen(false);
          setConfirmName("");
        }}
      >
        {deactivating ? (
          <Field label={`Type ${user.username} to confirm`} required>
            {(props) => (
              <Input
                {...props}
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, idleState);
  return (
    <UserFormFields
      formAction={formAction}
      state={state}
      submitLabel="Create account"
      showPassword
    />
  );
}

function EditUserForm({ user }: { user: StaffRow }) {
  const [state, formAction] = useActionState(updateUserAction, idleState);
  return (
    <UserFormFields
      formAction={formAction}
      state={state}
      submitLabel="Save changes"
      defaults={user}
    />
  );
}

function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(resetUserPasswordAction, idleState);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={userId} />
      <FormMessage state={state} />
      <Field label="New password" error={state.fieldErrors?.password} required>
        {(props) => <Input {...props} name="password" type="password" />}
      </Field>
      <SubmitButton pendingLabel="Resetting…">Reset password</SubmitButton>
    </form>
  );
}

function UserFormFields({
  formAction,
  state,
  submitLabel,
  defaults,
  showPassword = false,
}: {
  formAction: (payload: FormData) => void;
  state: ActionState;
  submitLabel: string;
  defaults?: StaffRow;
  showPassword?: boolean;
}) {
  const previewType = defaults?.userType ?? "";
  const mapped = resolveUniversityType(previewType);

  return (
    <form action={formAction} className="space-y-4">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <FormMessage state={state} />
      <FieldGroup title="Account">
        <Field label="Username" error={state.fieldErrors?.username} required>
          {(props) => (
            <Input {...props} name="username" defaultValue={defaults?.username} />
          )}
        </Field>
        <Field
          label="User type"
          error={state.fieldErrors?.userType}
          hint="Determines the assigned unit and access role."
          required
        >
          {(props) => (
            <NativeSelect
              {...props}
              name="userType"
              defaultValue={defaults?.userType ?? ""}
              required
            >
              <option value="" disabled>
                Select user type…
              </option>
              {UNIVERSITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {showPassword ? (
          <Field label="Password" error={state.fieldErrors?.password} required>
            {(props) => <Input {...props} name="password" type="password" />}
          </Field>
        ) : null}
        {mapped ? (
          <p className="text-muted-foreground text-xs">
            Assigned unit: {mapped.officeName ?? "Provost Office"}. Access role:{" "}
            {ROLE_META[mapped.role].label}.
          </p>
        ) : null}
      </FieldGroup>
      <FieldGroup title="Display">
        <Field label="Full name" error={state.fieldErrors?.fullName}>
          {(props) => (
            <Input {...props} name="fullName" defaultValue={defaults?.fullName} />
          )}
        </Field>
        <Field
          label="Email"
          error={state.fieldErrors?.email}
          hint="Defaults to a college address if left blank."
        >
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              defaultValue={defaults?.email}
            />
          )}
        </Field>
      </FieldGroup>
      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
