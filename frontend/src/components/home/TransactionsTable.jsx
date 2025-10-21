import { 
    Table, 
    TableHead, 
    TableRow, 
    TableCell, 
    TableBody, 
    Chip, 
    Typography 
} from "@mui/material";

export default function TransactionsTable({ rows }) {
    return (
        <Table size="small">
            <TableHead sx={{ background: '#f7f7f8' }}>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Buy/Sell</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">Price ($)</TableCell>
                    <TableCell align="right">Total ($)</TableCell>
                </TableRow>
            </TableHead>

            <TableBody>
                {rows.map((t) => (
                    <TableRow key={t.id} hover>
                        <TableCell>{t.dt}</TableCell>

                        <TableCell>
                            <Typography sx={{ fontWeight: 600, lineHeight: 1 }}>{t.symbol}</Typography>
                        </TableCell>

                        <TableCell>{t.company}</TableCell>

                        <TableCell>
                            <Chip
                                label={t.side}
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    bgcolor: t.side === "Buy" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                    color: t.side === "Buy" ? "#15803d" : "#b91c1c"
                                }}
                            />
                        </TableCell>

                        <TableCell align="right">{t.shares.toLocaleString()}</TableCell>
                        <TableCell align="right">{t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell align="right">{t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow>
                ))}
                {rows.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                            No transactions
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}