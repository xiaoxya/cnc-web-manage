/// <reference types="@sveltejs/kit" />

declare namespace App {
  interface Locals {
    user?: {
      id: number;
      username: string;
      displayName: string;
      role: string;
    };
  }
}
