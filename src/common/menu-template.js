import { dialog } from 'electron'
export const menuTemplate = (window) => {
    return [
        {
            label: 'View',
            submenu: [
                {
                    role: 'reload'
                },
                {
                    role: 'toggledevtools'
                }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'About',
                    click() {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About',
                            message: `Application: Wave Tool
Author: Steve Le
Version: 1.0.0`
                        }, () => { })
                    }
                }
            ]
        }
    ]
}