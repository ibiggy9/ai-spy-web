import React from "react";
import {
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@nextui-org/react";

export default function UserReportsGrid() {
  return (
    <Table
      classNames={{
        th: "bg-slate-900 text-gray-300",
        td: "text-white",
        wrapper: "bg-slate-900",
      }}
    >
      <TableHeader>
        <TableColumn>USER</TableColumn>
        <TableColumn>VISIBILITY</TableColumn>
        <TableColumn>DATE</TableColumn>
        <TableColumn>MODEL</TableColumn>
        <TableColumn>TITLE</TableColumn>
        <TableColumn>LINK</TableColumn>
        <TableColumn>FILE TYPE</TableColumn>
        <TableColumn>PREDICTION</TableColumn>
        <TableColumn>ACTIONS</TableColumn>
      </TableHeader>
      <TableBody emptyContent="No Rows To Display">
        <TableRow key="1">
          <TableCell>ian@ai-spy.xyz</TableCell>
          <TableCell>PUBLIC</TableCell>
          <TableCell>2024-08-27</TableCell>
          <TableCell>STAC-2.2</TableCell>
          <TableCell>S0KZ13X1f8rqbQ46.mp4</TableCell>
          <TableCell>N/A</TableCell>
          <TableCell>mp4</TableCell>
          <TableCell className="text-green-500">HUMAN</TableCell>
          <TableCell>
            <Button auto flat color="primary" className="mr-2" size="sm">
              Open
            </Button>
            <Button auto flat color="danger" size="sm">
              Delete
            </Button>
          </TableCell>
        </TableRow>
        <TableRow key="2">
          <TableCell>ian@ai-spy.xyz</TableCell>
          <TableCell>PUBLIC</TableCell>
          <TableCell>2024-08-27</TableCell>
          <TableCell>STAC-2.2</TableCell>
          <TableCell>S0KZ13X1f8rqbQ46.mp4</TableCell>
          <TableCell>N/A</TableCell>
          <TableCell>mp4</TableCell>
          <TableCell className="text-green-500">HUMAN</TableCell>
          <TableCell>
            <Button auto flat color="primary" size="sm" className="mr-2">
              Open
            </Button>
            <Button auto flat size="sm" color="danger">
              Delete
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
