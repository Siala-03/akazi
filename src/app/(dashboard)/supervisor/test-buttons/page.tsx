'use client';

import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function TestButtonsPage() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleClick = (buttonName: string) => {
        toast.success(`${buttonName} button clicked!`);
        setCount(count + 1);
    };

    const handleAsyncClick = async () => {
        setLoading(true);
        toast.loading('Processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoading(false);
        toast.dismiss();
        toast.success('Async action completed!');
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Toaster position="top-right" />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Button & Text Visibility Test</h1>
                <p className="mt-2 text-gray-600">
                    This page tests all button types and text visibility. Click count: <strong className="text-emerald-600">{count}</strong>
                </p>
            </div>

            {/* Text Visibility Tests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Text Visibility Tests</h2>
                
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Heading 1 - Should be very dark</h3>
                        <h4 className="text-lg font-semibold text-gray-800">Heading 2 - Should be dark</h4>
                        <h5 className="text-base font-semibold text-gray-700">Heading 3 - Should be medium dark</h5>
                    </div>

                    <div>
                        <p className="text-gray-900">Regular paragraph text - Should be very readable (gray-900)</p>
                        <p className="text-gray-700">Secondary text - Should be readable (gray-700)</p>
                        <p className="text-gray-600">Tertiary text - Should be slightly lighter (gray-600)</p>
                        <p className="text-gray-500">Muted text - Should be lighter (gray-500)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Input Label</label>
                        <input 
                            type="text" 
                            placeholder="Type here - text should be visible"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            defaultValue="This text should be clearly visible"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Dropdown</label>
                        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                            <option value="">Choose an option - text should be visible</option>
                            <option value="1">Option 1 - Should be visible</option>
                            <option value="2">Option 2 - Should be visible</option>
                            <option value="3">Option 3 - Should be visible</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Primary Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Primary Buttons (Emerald/Teal)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleClick('Primary Green')}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Emerald Button
                    </button>

                    <button
                        onClick={() => handleClick('Primary Teal')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-colors"
                    >
                        Gradient Button
                    </button>

                    <button
                        onClick={() => handleClick('Primary Large')}
                        className="px-8 py-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-lg"
                    >
                        Large Button
                    </button>
                </div>
            </div>

            {/* Secondary Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Secondary Buttons (Gray)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleClick('Secondary')}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                        Gray Button
                    </button>

                    <button
                        onClick={() => handleClick('Outline')}
                        className="px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                    >
                        Outline Button
                    </button>

                    <button
                        onClick={() => handleClick('Text Only')}
                        className="px-6 py-3 text-emerald-600 font-medium hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        Text Button
                    </button>
                </div>
            </div>

            {/* Button States */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Button States</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={handleAsyncClick}
                        disabled={loading}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Loading...' : 'Async Button'}
                    </button>

                    <button
                        disabled
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Disabled Button
                    </button>

                    <button
                        onClick={() => handleClick('Active')}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                    >
                        Click & Hold
                    </button>
                </div>
            </div>

            {/* Icon Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Icon Buttons</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => handleClick('Save')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                    </button>

                    <button
                        onClick={() => handleClick('Delete')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>

                    <button
                        onClick={() => handleClick('Edit')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                    </button>

                    <button
                        onClick={() => handleClick('Download')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>
                </div>
            </div>

            {/* Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Links & Navigation</h2>
                <div className="space-y-4">
                    <div>
                        <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Regular link - Should be green and underline on hover
                        </a>
                    </div>
                    <div>
                        <a href="#" className="text-blue-600 hover:text-blue-700 font-medium underline">
                            Underlined link - Should always be underlined
                        </a>
                    </div>
                    <div>
                        <button 
                            onClick={() => handleClick('Link Button')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                        >
                            Link-style button - Should work like a link
                        </button>
                    </div>
                </div>
            </div>

            {/* Small Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Small Buttons</h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleClick('Small 1')}
                        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                    >
                        Small
                    </button>
                    <button
                        onClick={() => handleClick('Small 2')}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300"
                    >
                        Small Gray
                    </button>
                    <button
                        onClick={() => handleClick('Small 3')}
                        className="px-3 py-1.5 text-sm border border-emerald-600 text-emerald-600 rounded font-medium hover:bg-emerald-50"
                    >
                        Small Outline
                    </button>
                    <button
                        onClick={() => handleClick('Tiny')}
                        className="px-2 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                    >
                        Tiny
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {count > 0 && (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-emerald-800 font-medium">
                        ✅ All buttons are working! Total clicks: {count}
                    </p>
                </div>
            )}
        </div>
    );
}
