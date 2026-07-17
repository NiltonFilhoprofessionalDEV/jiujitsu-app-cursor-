"use client";

import { useActionState } from "react";
import {
  createAcademy,
  type AcademyActionState,
} from "@/actions/academies";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AcademyActionState = null;

export function CreateAcademyForm() {
  const [state, formAction, pending] = useActionState(
    createAcademy,
    initialState,
  );

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="space-y-2 text-center">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          BJJ Pulse
        </p>
        <BlackBeltTitle className="text-lg font-medium text-muted-foreground">
          Criar sua academia
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Configure os dados principais. Você será o Owner.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da academia *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex.: Gracie Barra Centro"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contato@academia.com"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              name="instagram"
              placeholder="@suaacademia"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                name="state"
                maxLength={2}
                placeholder="SP"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Breve apresentação da academia"
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {state?.error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {pending ? "Criando…" : "Criar academia"}
          </Button>
        </form>
      </div>
    </div>
  );
}
