import { FaPiggyBank } from "react-icons/fa6";
import { MdAccessTimeFilled, MdDashboard } from "react-icons/md";
export const navItems = [
  {
    path: "/",
    label: "My Portfolio",
    icon: FaPiggyBank,
  },
  {
    path: "/timeseries",
    label: "Time Series",
    icon: MdAccessTimeFilled,
  },
  {
    path: "/far-dashboard",
    label: "FAR Dashboard",
    icon: MdDashboard,
  },
];
