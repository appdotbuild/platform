import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '../components/shared/select.js';
import { useSafeNavigate } from '../routes.js';
const items = [
    { label: '🆕 Create new app', value: '/app/build' },
    {
        label: '📋 List and iterate existing applications',
        value: '/apps',
    },
];
export function AppHomeScreen() {
    const { safeNavigate } = useSafeNavigate();
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: "\uD83E\uDD16 App Manager" }) }), _jsx(Select, { question: "What would you like to do?", options: items, onSubmit: (value) => {
                    safeNavigate({ path: value });
                } })] }));
}
//# sourceMappingURL=app-home-screen.js.map