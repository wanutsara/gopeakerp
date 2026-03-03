"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/outline";

export default function DeleteEmployeeButton({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${employeeName}"?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/hr/employees/${employeeId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(`เกิดข้อผิดพลาด: ${data.error || 'ไม่สามารถลบได้'}`);
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 disabled:opacity-50 ml-4 inline-flex items-center"
            title="ลบพนักงาน"
        >
            <TrashIcon className="w-4 h-4 mr-1" />
            {isDeleting ? "กำลังลบ..." : "ลบ"}
        </button>
    );
}
