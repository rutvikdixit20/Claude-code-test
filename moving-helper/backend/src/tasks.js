// Generate a default task checklist relative to a move date
export function generateDefaultTasks(moveDate) {
  const move = new Date(moveDate);
  const offset = (weeks) => {
    const d = new Date(move);
    d.setDate(d.getDate() - weeks * 7);
    return d.toISOString().split('T')[0];
  };

  return [
    // 8 weeks out
    { category: 'Planning', title: 'Set your moving budget', due_date: offset(8) },
    { category: 'Planning', title: 'Decide: hire movers or rent a truck', due_date: offset(8) },
    { category: 'Planning', title: 'Research and book moving company', due_date: offset(8) },
    { category: 'Planning', title: 'Book time off work', due_date: offset(8) },

    // 6 weeks out
    { category: 'Sorting', title: 'Start decluttering — donate or sell items', due_date: offset(6) },
    { category: 'Sorting', title: 'Order packing supplies (boxes, tape, bubble wrap)', due_date: offset(6) },
    { category: 'Admin', title: 'Notify landlord / give notice at current home', due_date: offset(6) },

    // 4 weeks out
    { category: 'Utilities', title: 'Set up electricity at new address', due_date: offset(4) },
    { category: 'Utilities', title: 'Set up gas/water at new address', due_date: offset(4) },
    { category: 'Utilities', title: 'Transfer or set up internet service', due_date: offset(4) },
    { category: 'Admin', title: 'Update address with USPS (mail forwarding)', due_date: offset(4) },
    { category: 'Packing', title: 'Start packing non-essential rooms', due_date: offset(4) },

    // 2 weeks out
    { category: 'Admin', title: 'Update address with bank / credit cards', due_date: offset(2) },
    { category: 'Admin', title: 'Update address with employer / HR', due_date: offset(2) },
    { category: 'Admin', title: 'Update subscriptions (Amazon, Netflix, etc.)', due_date: offset(2) },
    { category: 'Admin', title: 'Update address with doctor / dentist', due_date: offset(2) },
    { category: 'Packing', title: 'Pack bedrooms and closets', due_date: offset(2) },
    { category: 'Packing', title: 'Label all boxes with room and contents', due_date: offset(2) },

    // 1 week out
    { category: 'Admin', title: 'Update DMV / drivers license address', due_date: offset(1) },
    { category: 'Admin', title: 'Transfer or cancel gym membership', due_date: offset(1) },
    { category: 'Utilities', title: 'Schedule disconnection of utilities at old address', due_date: offset(1) },
    { category: 'Packing', title: 'Pack kitchen (keep essentials accessible)', due_date: offset(1) },
    { category: 'Packing', title: 'Prepare an essentials box (toiletries, chargers, snacks)', due_date: offset(1) },

    // Move day
    { category: 'Move Day', title: 'Confirm movers / truck rental', due_date: moveDate },
    { category: 'Move Day', title: 'Do final walkthrough of old home', due_date: moveDate },
    { category: 'Move Day', title: 'Return keys / garage openers', due_date: moveDate },
    { category: 'Move Day', title: 'Take meter readings at both addresses', due_date: moveDate },
    { category: 'Move Day', title: 'Check all furniture fits through new doorways', due_date: moveDate },
  ];
}
