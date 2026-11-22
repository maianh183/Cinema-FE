import { todayVN, addDays, weekStart } from '../utils/calendar';
import { showtimeEnd } from '../utils/business';
// Deterministic relative seed. Shared collections are the single source of truth for mock reads/writes.
export function expandData(db, anchor = todayVN()) {
  const date = (offset) => addDays(anchor, offset),
    start = addDays(weekStart(anchor), -14);
  db.branches.push(
    ...['CineFlow Bình Thạnh', 'CineFlow Quận 7'].map((bName, i) => ({
      branchId: i + 3,
      bName,
      bAddress: `${30 + i * 10} Đường Demo, TP. Hồ Chí Minh`,
      phoneNumbers: ['0281234500' + i],
      isActive: true,
      totalRooms: 2,
    })),
  );
  for (let n = 5; n <= 20; n++) {
    const branchId = n <= 7 ? n - 3 : (n % 4) + 1;
    db.employees.push({
      ...db.employees[2],
      eUserId: 'NV' + String(n).padStart(3, '0'),
      eName: n <= 7 ? 'Quản lý chi nhánh ' + branchId : 'Nhân viên Demo ' + n,
      email: n <= 7 ? `manager${branchId}@cinema.test` : `employee${n}@cinema.test`,
      userType: n <= 7 ? 'MANAGER' : 'STAFF',
      branchId,
      branchName: db.branches[branchId - 1].bName,
      phoneNumber: '090200' + String(n).padStart(4, '0'),
      salary: 8000000 + n * 200000,
    });
  }
  db.branches.forEach((b) => {
    const manager = db.employees.find((e) => e.userType === 'MANAGER' && e.branchId === b.branchId);
    Object.assign(b, { managerId: manager.eUserId, managerName: manager.eName, totalRooms: 2 });
  });
  db.movies.forEach((m, i) =>
    Object.assign(m, {
      releaseDate: date(i > 9 ? 14 : -90),
      closingDate: date(i > 9 ? 100 : i === 9 ? -1 : 90),
      runTime: 110 + (i % 3) * 10,
    }),
  );
  db.rooms = db.branches.flatMap((b) =>
    [1, 2].map((roomId) => ({
      branchId: b.branchId,
      roomId,
      rType: roomId === 1 ? '2D' : '3D',
      rCapacity: 40,
      basePrice: roomId === 1 ? 80000 : 110000,
      totalSeats: 40,
      isActive: true,
    })),
  );
  db.seats = db.rooms.flatMap((r) =>
    Array.from({ length: 40 }, (_, i) => ({
      branchId: r.branchId,
      roomId: r.roomId,
      sRow: Math.floor(i / 10) + 1,
      sColumn: (i % 10) + 1,
      sType: i >= 20 ? 2 : 1,
      sPrice: i >= 20 ? 10000 : 0,
      sStatus: true,
      isBooked: false,
    })),
  );
  db.showtimes = db.rooms.flatMap((r) =>
    Array.from({ length: 14 }, (_, d) =>
      [10, 14, 18].map((h, i) => {
        const movie = db.movies[(r.roomId + i + d) % 9];
        return {
          timeId: r.branchId * 10000 + r.roomId * 1000 + d * 10 + i,
          movieId: movie.movieId,
          movieName: movie.mName,
          branchId: r.branchId,
          branchName: db.branches[r.branchId - 1].bName,
          roomId: r.roomId,
          rType: r.rType,
          rPrice: r.basePrice,
          formatName: r.rType,
          day: date(d - 7),
          startTime: h + ':00:00',
          ...showtimeEnd(date(d - 7), h + ':00', movie.runTime),
          status: d < 7 ? 'FINISHED' : 'SCHEDULED',
        };
      }),
    ).flat(),
  );
  // Keep customer IDs and the first 16 profiles compatible with existing forms.
  for (let i = 16; i < 32; i++)
    db.customers.push({
      ...db.customers[i % 16],
      cUserId: 'KH' + String(i + 1).padStart(3, '0'),
      cName: 'Khách hàng Demo ' + (i + 1),
      email: `customer${i + 1}@example.test`,
      phoneNumber: '090100' + String(i).padStart(4, '0'),
    });
  db.customers.forEach((c, i) =>
    Object.assign(c, { createdAt: date(-120 + i), updatedAt: date(-i % 10), isActive: i !== 30 }),
  );
  for (let i = 0; i < 12; i++)
    db['food-drinks'].push({
      productId: 4 + i,
      pName: ['Bắp caramel', 'Trà đào', 'Combo đôi'][i % 3] + ' ' + (i + 1),
      pType: i % 3 === 1 ? 'Nước' : 'Bắp',
      price: 35000 + i * 5000,
      quantity: i === 10 ? 0 : 40 + i,
      imgUrl: '',
      itemType: 'FOOD_DRINK',
      startDate: date(i === 11 ? 10 : -60),
      endDate: date(90),
      description: 'Sản phẩm demo tại quầy.',
    });
  for (let i = 0; i < 11; i++)
    db.merchandise.push({
      productId: 16 + i,
      merchName: 'Bộ sưu tập điện ảnh ' + (i + 1),
      price: 59000 + i * 10000,
      availNum: i === 10 ? 0 : 20 + i,
      imgUrl: '',
      itemType: 'MERCHANDISE',
      startDate: date(-60),
      endDate: date(i === 9 ? -1 : 90),
      description: 'Quà lưu niệm demo.',
    });
  [...db['food-drinks'].slice(0, 2), db.merchandise[0]].forEach((p) =>
    Object.assign(p, { startDate: date(-60), endDate: date(90) }),
  );
  db.coupons = Array.from({ length: 12 }, (_, i) => ({
    couponId: i + 1,
    startDate: date(i % 3 === 1 ? 7 : -20),
    endDate: date(i % 3 === 2 ? -1 : 30),
    saleOff: 10 + (i % 4) * 5,
    releaseNum: 100 + i * 20,
    availNum: i === 9 ? 0 : 80 + i * 10,
    minOrderTotal: i % 2 ? 100000 : 0,
    maxDiscount: 50000 + i * 10000,
  }));
  db['work-schedules'] = db.employees
    .filter((e) => e.userType !== 'ADMIN')
    .flatMap((employee, i) =>
      Array.from({ length: 42 }, (_, d) => {
        if ((d + i) % 7 >= 5) return null;
        const workDate = addDays(start, d),
          slot = i % 4;
        const hours = [
          ['08:00:00', '12:00:00', 'Ca sáng'],
          ['13:00:00', '17:00:00', 'Ca chiều'],
          ['17:00:00', '22:00:00', 'Ca tối'],
          ['22:00:00', '02:00:00', 'Ca đêm'],
        ][slot];
        return {
          scheduleId: i * 100 + d + 1,
          employeeId: employee.eUserId,
          branchId: employee.branchId,
          workDate,
          endDate: slot === 3 ? addDays(workDate, 1) : workDate,
          startTime: hours[0],
          endTime: hours[1],
          work: hours[2],
          position: i % 2 ? 'Quầy vé' : 'Hỗ trợ phòng chiếu',
          status: 'ASSIGNED',
        };
      }).filter(Boolean),
    );
  db.orders = Array.from({ length: 48 }, (_, i) => {
    const branchId = i < 32 ? (i % 2) + 1 : (i % 2) + 3,
      showtimes = db.showtimes.filter((s) => s.branchId === branchId && s.day <= anchor),
      st = showtimes[i % showtimes.length],
      customer = db.customers[i % db.customers.length],
      staff = db.employees.find((e) => e.userType === 'STAFF' && e.branchId === branchId),
      product = db['food-drinks'][i % db['food-drinks'].length];
    const source = i % 4 === 1 ? 'CUSTOMER' : 'STAFF',
      orderStatus =
        source === 'CUSTOMER'
          ? 'PAID'
          : i % 13 === 12
            ? 'CANCELLED'
            : i % 3 === 0
              ? 'PENDING'
              : 'PAID';
    const ticketCount = i === 0 ? 2 : 1 + (i % 3),
      tickets = Array.from({ length: ticketCount }, (_, n) => ({
        ticketId: 1000 + i * 3 + n,
        showtimeId: st.timeId,
        movieId: st.movieId,
        movieName: st.movieName,
        branchId,
        roomId: st.roomId,
        screenRoomName: 'Phòng ' + st.roomId,
        branchName: st.branchName,
        sRow: 1,
        sColumn: ((i * 3 + n) % 10) + 1,
        seatName: 'A' + (((i * 3 + n) % 10) + 1),
        showtime: st.day + 'T' + st.startTime + '+07:00',
        price: st.rPrice,
      }));
    const addonDetails =
        i > 0 && i % 2 === 0
          ? [
              {
                productId: product.productId,
                productName: product.pName,
                itemType: 'FOOD_DRINK',
                quantity: 1,
                price: product.price,
              },
            ]
          : [],
      total =
        tickets.reduce((s, t) => s + t.price, 0) +
        addonDetails.reduce((s, a) => s + a.price * a.quantity, 0);
    return {
      orderId: 100 + i,
      source,
      createdByEmployeeId: source === 'STAFF' ? staff.eUserId : null,
      branchId,
      orderTime: st.day + 'T08:00:00+07:00',
      paymentMethod: source === 'CUSTOMER' ? 'VNPAY' : 'CASH',
      originalTotal: total,
      discountAmount: 0,
      total,
      orderStatus,
      ticketDetails: tickets,
      addonDetails,
      customer: { ...customer },
    };
  });
  db.faq = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    question:
      [
        'Làm thế nào để đặt vé?',
        'Có thể đổi suất chiếu không?',
        'Ưu đãi thành viên áp dụng thế nào?',
      ][i % 3] +
      ' ' +
      (i + 1),
    answer: 'Thông tin mẫu ' + (i + 1) + ' — liên hệ nhân viên để được hướng dẫn.',
    sortOrder: i + 1,
    status: i % 4 ? 'PUBLISHED' : 'DRAFT',
  }));
  db.news = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    title: 'Tin điện ảnh và hoạt động rạp ' + (i + 1),
    slug: 'tin-dien-anh-' + (i + 1),
    seoTitle: 'CineFlow ' + (i + 1),
    metaDescription: 'Thông tin doanh nghiệp mô phỏng.',
    tags: 'điện ảnh,rạp phim',
    content: 'Nội dung văn bản demo ' + (i + 1),
    category: 'Doanh nghiệp',
    status: ['DRAFT', 'PUBLISHED', 'HIDDEN'][i % 3],
    imageUrl: '',
    createdAt: date(-i),
  }));
  db['movie-comments'] = Array.from({ length: 24 }, (_, i) => ({
    commentId: i + 1,
    movieId: db.movies[i % db.movies.length].movieId,
    movieTitle: db.movies[i % db.movies.length].mName,
    userId: db.customers[i].cUserId,
    authorName: db.customers[i].cName,
    rating: i === 0 ? 5 : (i % 5) + 1,
    content: i % 4 === 0 ? null : 'Cảm nhận về bộ phim ' + (i + 1),
    contentStatus: 'VISIBLE',
    createdAt: date(-i % 14) + 'T09:00:00+07:00',
  }));
  db['cinema-reviews'] = Array.from({ length: 32 }, (_, i) => {
    const branchId = i < 12 ? 1 : i < 20 ? 2 : i < 26 ? 3 : 4;
    return {
      reviewId: i + 1,
      branchId,
      branchName: db.branches[branchId - 1].bName,
      roomId: i % 2 ? 1 : null,
      userId: db.customers[i].cUserId,
      authorName: db.customers[i].cName,
      content:
        'Trải nghiệm tại rạp ' +
        (i + 1) +
        ': ' +
        ['Không gian sạch sẽ.', 'Nhân viên hỗ trợ tận tình.', 'Cần cải thiện thời gian chờ.'][
          i % 3
        ],
      contentStatus: 'VISIBLE',
      createdAt: date(-i % 14) + 'T09:30:00+07:00',
    };
  });
  for (let i = 4; i < 20; i++) {
    const targetType = i % 2 ? 'CINEMA_REVIEW' : 'MOVIE_COMMENT',
      targetId = i + 1;
    db['comment-reports'].push({
      id: i + 1,
      targetType,
      targetId,
      reporterId: db.customers[(i + 5) % 32].cUserId,
      reporterName: db.customers[(i + 5) % 32].cName,
      reason: 'Yêu cầu kiểm tra nội dung ' + (i + 1),
      reportedAt: date(-i % 7) + 'T10:00:00+07:00',
      status: i % 4 === 0 ? 'RESOLVED' : 'PENDING',
      resolutionAction: i % 4 === 0 ? 'DISMISS' : null,
      resolvedAt: i % 4 === 0 ? date(-i % 7) + 'T11:00:00+07:00' : null,
    });
  }
  return db;
}
