import type { ReactNode } from "react";

declare module "@tanstack/react-table" {
  export type ColumnDef<TData = unknown, TValue = unknown> = {
    id?: string;
    header?: unknown;
    cell?: (context: { row: { original: TData }; getValue?: () => TValue }) => unknown;
  };

  export function getCoreRowModel(): unknown;
  export function flexRender(component: unknown, context: unknown): ReactNode;
  export function useReactTable<TData>(options: {
    data: TData[];
    columns: ColumnDef<TData>[];
    getCoreRowModel: unknown;
  }): {
    getHeaderGroups: () => Array<{
      id: string;
      headers: Array<{
        id: string;
        column: { id: string; columnDef: ColumnDef<TData> };
        getContext: () => unknown;
      }>;
    }>;
    getRowModel: () => {
      rows: Array<{
        id: string;
        original: TData;
        getVisibleCells: () => Array<{
          id: string;
          column: { id: string; columnDef: ColumnDef<TData> };
          getContext: () => unknown;
        }>;
      }>;
    };
  };
}
