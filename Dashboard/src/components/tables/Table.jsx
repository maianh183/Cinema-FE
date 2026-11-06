// Adapted from TailAdmin Free (MIT). See THIRD_PARTY_NOTICES.md.
import { cn } from "@/lib/utils";
// Table Component
const Table = ({ children, className }) => {
    return <table className={cn("min-w-full", className)}>{children}</table>;
};
// TableHeader Component
const TableHeader = ({ children, className }) => {
    return <thead className={className}>{children}</thead>;
};
// TableBody Component
const TableBody = ({ children, className }) => {
    return <tbody className={className}>{children}</tbody>;
};
// TableRow Component
const TableRow = ({ children, className }) => {
    return <tr className={className}>{children}</tr>;
};
// TableCell Component
const TableCell = ({ children, isHeader = false, className, }) => {
    const CellTag = isHeader ? "th" : "td";
    return <CellTag className={cn(className)}>{children}</CellTag>;
};
export { Table, TableBody, TableCell, TableHeader, TableRow };
