import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./DataTable.module.css";

export interface Column<T> {
	key: string;
	header: string;
	render?: (item: T) => React.ReactNode;
	width?: string;
	align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	onRowClick?: (item: T) => void;
	emptyMessage?: string;
	wrapHeaders?: boolean;
}

function DataTable<T extends { _id?: string }>({
	data,
	columns,
	onRowClick,
	emptyMessage,
	wrapHeaders = false,
}: DataTableProps<T>) {
	const { t } = useTranslation();

	const getAlignClass = (align?: Column<T>["align"]) => {
		switch (align) {
			case "center":
				return styles.alignCenter;
			case "right":
				return styles.alignRight;
			default:
				return styles.alignLeft;
		}
	};

	return (
		<div className={styles.tableWrapper}>
			<div className={styles.tableContainer}>
				<table className={styles.table}>
					<colgroup>
						{columns.map((column) => (
							<col key={column.key} width={column.width} />
						))}
					</colgroup>
					<thead className={styles.thead}>
						<tr>
							{columns.map((column) => (
								<th
									key={column.key}
									className={`${styles.th} ${wrapHeaders ? styles.wrapHeader : ""} ${getAlignClass(column.align)}`}
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className={styles.tbody}>
						{data.length === 0 ? (
							<tr>
								<td colSpan={columns.length} className={styles.emptyCell}>
									{emptyMessage ??
										t("common.noData", {
											defaultValue: "No hay datos para mostrar",
										})}
								</td>
							</tr>
						) : (
							data.map((item, index) => (
								<tr
									key={item._id || index}
									className={`${styles.tr} ${onRowClick ? styles.clickableRow : styles.staticRow}`}
									onClick={() => onRowClick?.(item)}
								>
									{columns.map((column) => (
										<td
											key={column.key}
											className={`${styles.td} ${getAlignClass(column.align)}`}
										>
											{column.render
												? column.render(item)
												: (item as Record<string, React.ReactNode>)[column.key]}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default DataTable;
